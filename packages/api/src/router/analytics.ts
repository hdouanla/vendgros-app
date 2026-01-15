import { z } from "zod/v4";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { listing, rating, reservation, user } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const analyticsRouter = createTRPCRouter({
  /**
   * Get comprehensive seller analytics
   */
  getSellerAnalytics: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sellerId = ctx.session.user.id;

      // Calculate date range
      const now = new Date();
      let startDate: Date;

      switch (input.timeRange) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }

      // Get all seller listings
      const allListings = await ctx.db.query.listing.findMany({
        where: (listings, { eq }) => eq(listings.sellerId, sellerId),
      });

      // Get listings in time range
      const timeRangeListings = allListings.filter(
        (l) => new Date(l.createdAt) >= startDate,
      );

      // Get all reservations for seller's listings
      const allReservations = await Promise.all(
        allListings.map(async (l) => {
          const reservations = await ctx.db.query.reservation.findMany({
            where: (reservations, { eq }) => eq(reservations.listingId, l.id),
          });
          return { listingId: l.id, listingTitle: l.title, reservations };
        }),
      );

      const flatReservations = allReservations.flatMap((r) =>
        r.reservations.map((res) => ({
          ...res,
          listingTitle: r.listingTitle,
        })),
      );

      const timeRangeReservations = flatReservations.filter(
        (r) => new Date(r.createdAt) >= startDate,
      );

      // Calculate total revenue (deposit + balance)
      const totalRevenue = timeRangeReservations
        .filter((r) => r.status === "COMPLETED")
        .reduce((sum, r) => sum + r.totalPrice, 0);

      const totalDeposits = timeRangeReservations
        .filter((r) => r.status === "CONFIRMED" || r.status === "COMPLETED")
        .reduce((sum, r) => sum + r.depositAmount, 0);

      // Calculate completion rate
      const completedCount = timeRangeReservations.filter(
        (r) => r.status === "COMPLETED",
      ).length;
      const totalReservations = timeRangeReservations.length;
      const completionRate =
        totalReservations > 0 ? completedCount / totalReservations : 0;

      // Calculate no-show rate
      const noShowCount = timeRangeReservations.filter(
        (r) => r.status === "NO_SHOW",
      ).length;
      const noShowRate = totalReservations > 0 ? noShowCount / totalReservations : 0;

      // Get ratings data
      const ratings = await ctx.db.query.rating.findMany({
        where: (ratings, { eq }) => eq(ratings.ratedId, sellerId),
      });

      const timeRangeRatings = ratings.filter(
        (r) => new Date(r.createdAt) >= startDate,
      );

      // Calculate average rating
      const avgRating =
        timeRangeRatings.length > 0
          ? timeRangeRatings.reduce((sum, r) => sum + r.score, 0) /
            timeRangeRatings.length
          : 0;

      // Get top performing listings
      const listingPerformance = await Promise.all(
        allListings.map(async (l) => {
          const listingReservations = flatReservations.filter(
            (r) => r.listingId === l.id,
          );

          const revenue = listingReservations
            .filter((r) => r.status === "COMPLETED")
            .reduce((sum, r) => sum + r.totalPrice, 0);

          const views = 0; // TODO: Track views when implemented

          return {
            id: l.id,
            title: l.title,
            status: l.status,
            revenue,
            reservationsCount: listingReservations.length,
            views,
            conversionRate:
              views > 0 ? listingReservations.length / views : 0,
          };
        }),
      );

      // Sort by revenue
      const topListings = listingPerformance
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate daily revenue trend (last 30 days)
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (29 - i));
        date.setHours(0, 0, 0, 0);
        return date;
      });

      const dailyRevenue = last30Days.map((date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const dayRevenue = flatReservations
          .filter(
            (r) =>
              r.status === "COMPLETED" &&
              new Date(r.completedAt!) >= date &&
              new Date(r.completedAt!) < nextDay,
          )
          .reduce((sum, r) => sum + r.totalPrice, 0);

        return {
          date: date.toISOString().split("T")[0],
          revenue: dayRevenue,
        };
      });

      return {
        overview: {
          totalListings: timeRangeListings.length,
          activeListings: timeRangeListings.filter((l) => l.status === "PUBLISHED")
            .length,
          totalReservations,
          completedReservations: completedCount,
          totalRevenue,
          totalDeposits,
          completionRate,
          noShowRate,
          avgRating,
          totalRatings: timeRangeRatings.length,
        },
        topListings,
        dailyRevenue,
        timeRange: input.timeRange,
      };
    }),

  /**
   * Get geographic distribution of buyers
   */
  getGeographicDistribution: protectedProcedure.query(async ({ ctx }) => {
    const sellerId = ctx.session.user.id;

    // Get all seller listings
    const listings = await ctx.db.query.listing.findMany({
      where: (listings, { eq }) => eq(listings.sellerId, sellerId),
    });

    // Get all reservations with buyer location data
    const allLocations = await Promise.all(
      listings.map(async (listing) => {
        const reservations = await ctx.db.query.reservation.findMany({
          where: (reservations, { eq }) => eq(reservations.listingId, listing.id),
        });

        // For geographic heatmap, we'd need buyer postal codes
        // This is a simplified version
        return {
          listingId: listing.id,
          latitude: listing.latitude,
          longitude: listing.longitude,
          reservationCount: reservations.length,
        };
      }),
    );

    return allLocations.filter((l) => l.reservationCount > 0);
  }),

  /**
   * Get performance metrics by category
   */
  getCategoryPerformance: protectedProcedure.query(async ({ ctx }) => {
    const sellerId = ctx.session.user.id;

    const listings = await ctx.db.query.listing.findMany({
      where: (listings, { eq }) => eq(listings.sellerId, sellerId),
    });

    // Group by category
    const categoryMap = new Map<
      string,
      {
        listingCount: number;
        totalRevenue: number;
        reservationCount: number;
      }
    >();

    for (const listing of listings) {
      const reservations = await ctx.db.query.reservation.findMany({
        where: (reservations, { eq }) => eq(reservations.listingId, listing.id),
      });

      const revenue = reservations
        .filter((r) => r.status === "COMPLETED")
        .reduce((sum, r) => sum + r.totalPrice, 0);

      const existing = categoryMap.get(listing.category) || {
        listingCount: 0,
        totalRevenue: 0,
        reservationCount: 0,
      };

      categoryMap.set(listing.category, {
        listingCount: existing.listingCount + 1,
        totalRevenue: existing.totalRevenue + revenue,
        reservationCount: existing.reservationCount + reservations.length,
      });
    }

    const categoryPerformance = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        ...data,
        avgRevenuePerListing: data.totalRevenue / data.listingCount,
      }),
    );

    return categoryPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }),

  /**
   * Get buyer insights
   */
  getBuyerInsights: protectedProcedure.query(async ({ ctx }) => {
    const sellerId = ctx.session.user.id;

    const listings = await ctx.db.query.listing.findMany({
      where: (listings, { eq }) => eq(listings.sellerId, sellerId),
    });

    // Get all buyers who reserved from this seller
    const buyerData = new Map<
      string,
      {
        email: string;
        reservationCount: number;
        totalSpent: number;
        lastReservation: Date;
      }
    >();

    for (const listing of listings) {
      const reservations = await ctx.db.query.reservation.findMany({
        where: (reservations, { eq }) => eq(reservations.listingId, listing.id),
        with: {
          buyer: {
            columns: {
              id: true,
              email: true,
            },
          },
        },
      });

      for (const res of reservations) {
        const spent = res.status === "COMPLETED" ? res.totalPrice : 0;

        const existing = buyerData.get(res.buyerId) || {
          email: res.buyer.email!,
          reservationCount: 0,
          totalSpent: 0,
          lastReservation: res.createdAt,
        };

        buyerData.set(res.buyerId, {
          email: existing.email,
          reservationCount: existing.reservationCount + 1,
          totalSpent: existing.totalSpent + spent,
          lastReservation:
            res.createdAt > existing.lastReservation
              ? res.createdAt
              : existing.lastReservation,
        });
      }
    }

    const buyers = Array.from(buyerData.entries()).map(([id, data]) => ({
      buyerId: id,
      ...data,
    }));

    // Sort by total spent
    const topBuyers = buyers.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

    // Calculate repeat buyer rate
    const repeatBuyers = buyers.filter((b) => b.reservationCount > 1).length;
    const repeatBuyerRate = buyers.length > 0 ? repeatBuyers / buyers.length : 0;

    return {
      totalUniqueBuyers: buyers.length,
      repeatBuyers,
      repeatBuyerRate,
      topBuyers,
    };
  }),

  /**
   * Get time-based performance insights
   */
  getTimeBasedInsights: protectedProcedure.query(async ({ ctx }) => {
    const sellerId = ctx.session.user.id;

    const listings = await ctx.db.query.listing.findMany({
      where: (listings, { eq }) => eq(listings.sellerId, sellerId),
    });

    // Get all reservations
    const allReservations = await Promise.all(
      listings.map(async (l) =>
        ctx.db.query.reservation.findMany({
          where: (reservations, { eq }) => eq(reservations.listingId, l.id),
        }),
      ),
    );

    const flatReservations = allReservations.flat();

    // Group by day of week
    const dayOfWeekData = Array.from({ length: 7 }, (_, i) => ({
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
      reservations: 0,
      revenue: 0,
    }));

    // Group by hour of day
    const hourOfDayData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      reservations: 0,
      revenue: 0,
    }));

    for (const res of flatReservations) {
      const date = new Date(res.createdAt);
      const dayOfWeek = date.getDay();
      const hourOfDay = date.getHours();
      const revenue = res.status === "COMPLETED" ? res.totalPrice : 0;

      const dayData = dayOfWeekData[dayOfWeek];
      if (dayData) {
        dayData.reservations++;
        dayData.revenue += revenue;
      }

      const hourData = hourOfDayData[hourOfDay];
      if (hourData) {
        hourData.reservations++;
        hourData.revenue += revenue;
      }
    }

    return {
      byDayOfWeek: dayOfWeekData,
      byHourOfDay: hourOfDayData,
    };
  }),
});
