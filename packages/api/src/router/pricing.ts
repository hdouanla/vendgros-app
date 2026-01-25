import { z } from "zod/v4";
import { and, desc, eq, gte } from "@acme/db";

import { listing, reservation } from "@acme/db/schema";

import {
  analyzePricePerformance,
  calculateDynamicPrice,
  getCategoryBenchmarks,
  getPriceRecommendation,
} from "../services/pricing-ai";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const pricingRouter = createTRPCRouter({
  /**
   * Get AI-powered price recommendation for a new or existing listing
   */
  getPriceRecommendation: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        category: z.string(),
        quantityTotal: z.number(),
        location: z.string().optional(),
        listingId: z.string().optional(), // If updating existing listing
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get similar listings in the same category
      const similarListings = await ctx.db.query.listing.findMany({
        where: (listings, { eq, and }) =>
          and(
            eq(listings.category, input.category),
            eq(listings.status, "PUBLISHED"),
          ),
        columns: {
          id: true,
          title: true,
          pricePerPiece: true,
          status: true,
        },
        limit: 10,
      });

      // Get seller's historical pricing if this is an update
      let historicalPrices: Array<{
        price: number;
        quantitySold: number;
        daysToSell: number;
      }> = [];

      if (input.listingId) {
        // Get past reservations for seller's similar listings
        const sellerListings = await ctx.db.query.listing.findMany({
          where: (listings, { eq, and }) =>
            and(
              eq(listings.sellerId, ctx.session.user.id),
              eq(listings.category, input.category),
              eq(listings.status, "COMPLETED"),
            ),
          limit: 5,
        });

        historicalPrices = await Promise.all(
          sellerListings.map(async (l) => {
            const reservations = await ctx.db.query.reservation.findMany({
              where: (reservations, { eq }) =>
                eq(reservations.listingId, l.id),
            });

            const totalSold = reservations.reduce(
              (sum, r) => sum + r.quantityReserved,
              0,
            );

            const createdAt = new Date(l.createdAt);
            const publishedAt = l.publishedAt
              ? new Date(l.publishedAt)
              : createdAt;
            const lastReservation =
              reservations.length > 0
                ? new Date(
                    Math.max(
                      ...reservations.map((r) =>
                        new Date(r.createdAt).getTime(),
                      ),
                    ),
                  )
                : publishedAt;

            const daysToSell = Math.max(
              1,
              Math.ceil(
                (lastReservation.getTime() - publishedAt.getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            );

            return {
              price: l.pricePerPiece,
              quantitySold: totalSold,
              daysToSell,
            };
          }),
        );
      }

      // Get AI recommendation
      const recommendation = await getPriceRecommendation({
        title: input.title,
        description: input.description,
        category: input.category,
        quantityTotal: input.quantityTotal,
        location: input.location,
        historicalPrices: historicalPrices.filter((h) => h.quantitySold > 0),
        similarListings: similarListings.map((l) => ({
          title: l.title,
          price: l.pricePerPiece,
          status: l.status,
        })),
      });

      return recommendation;
    }),

  /**
   * Get category pricing benchmarks
   */
  getCategoryBenchmarks: protectedProcedure
    .input(
      z.object({
        category: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const benchmarks = getCategoryBenchmarks(input.category);

      // Get actual market data for this category
      const categoryListings = await ctx.db.query.listing.findMany({
        where: (listings, { eq, and }) =>
          and(
            eq(listings.category, input.category),
            eq(listings.status, "PUBLISHED"),
          ),
        columns: {
          pricePerPiece: true,
        },
      });

      const actualPrices = categoryListings.map((l) => l.pricePerPiece);
      const actualAveragePrice =
        actualPrices.length > 0
          ? actualPrices.reduce((sum, p) => sum + p, 0) / actualPrices.length
          : benchmarks.averagePrice;

      const actualMin =
        actualPrices.length > 0 ? Math.min(...actualPrices) : benchmarks.priceRange.min;
      const actualMax =
        actualPrices.length > 0 ? Math.max(...actualPrices) : benchmarks.priceRange.max;

      return {
        category: input.category,
        benchmarks,
        actualMarketData: {
          averagePrice: actualAveragePrice,
          priceRange: { min: actualMin, max: actualMax },
          listingCount: categoryListings.length,
        },
      };
    }),

  /**
   * Analyze price performance of an existing listing
   */
  analyzePricePerformance: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const listingData = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
      });

      if (!listingData) {
        throw new Error("Listing not found");
      }

      // Verify ownership
      if (listingData.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      // Get reservations for this listing
      const reservations = await ctx.db.query.reservation.findMany({
        where: (reservations, { eq }) => eq(reservations.listingId, input.listingId),
      });

      // Calculate metrics
      const daysListed = Math.max(
        1,
        Math.ceil(
          (new Date().getTime() - new Date(listingData.createdAt).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      );

      const viewsCount = listingData.viewCount ?? 0;

      const analysis = await analyzePricePerformance({
        listingId: input.listingId,
        currentPrice: listingData.pricePerPiece,
        daysListed,
        viewsCount,
        reservationCount: reservations.length,
        quantityRemaining: listingData.quantityAvailable,
        quantityTotal: listingData.quantityTotal,
      });

      const suggestedPrice =
        listingData.pricePerPiece * (1 + analysis.adjustmentPercentage / 100);

      return {
        ...analysis,
        currentPrice: listingData.pricePerPiece,
        suggestedPrice: Math.max(0.5, suggestedPrice), // Minimum $0.50
        listing: {
          title: listingData.title,
          quantityTotal: listingData.quantityTotal,
          quantityAvailable: listingData.quantityAvailable,
          daysListed,
        },
      };
    }),

  /**
   * Calculate dynamic pricing based on time and inventory
   */
  calculateDynamicPrice: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const listingData = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
      });

      if (!listingData) {
        throw new Error("Listing not found");
      }

      // Verify ownership
      if (listingData.sellerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      // Calculate hours remaining (assuming 48-hour listing window)
      const createdAt = new Date(listingData.createdAt);
      const expiresAt = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
      const hoursRemaining = Math.max(
        0,
        (expiresAt.getTime() - new Date().getTime()) / (60 * 60 * 1000),
      );

      const dynamicPricing = calculateDynamicPrice({
        basePrice: listingData.pricePerPiece,
        hoursRemaining,
        quantityRemaining: listingData.quantityAvailable,
        quantityTotal: listingData.quantityTotal,
      });

      return {
        ...dynamicPricing,
        currentPrice: listingData.pricePerPiece,
        hoursRemaining,
        listing: {
          title: listingData.title,
          quantityAvailable: listingData.quantityAvailable,
          quantityTotal: listingData.quantityTotal,
        },
      };
    }),

  /**
   * Get pricing insights for seller dashboard
   */
  getPricingInsights: protectedProcedure.query(async ({ ctx }) => {
    const sellerId = ctx.session.user.id;

    // Get all seller listings
    const listings = await ctx.db.query.listing.findMany({
      where: (listings, { eq }) => eq(listings.sellerId, sellerId),
    });

    // Analyze each listing's pricing
    const insights = await Promise.all(
      listings
        .filter((l) => l.status === "PUBLISHED")
        .map(async (listing) => {
          const reservations = await ctx.db.query.reservation.findMany({
            where: (reservations, { eq }) =>
              eq(reservations.listingId, listing.id),
          });

          const daysListed = Math.max(
            1,
            Math.ceil(
              (new Date().getTime() -
                new Date(listing.createdAt).getTime()) /
                (24 * 60 * 60 * 1000),
            ),
          );

          const sellThroughRate =
            (listing.quantityTotal - listing.quantityAvailable) /
            listing.quantityTotal;

          return {
            listingId: listing.id,
            title: listing.title,
            currentPrice: listing.pricePerPiece,
            sellThroughRate,
            daysListed,
            reservationCount: reservations.length,
            needsAttention: sellThroughRate < 0.3 && daysListed > 3,
          };
        }),
    );

    return insights.sort((a, b) => {
      // Sort by "needs attention" first
      if (a.needsAttention && !b.needsAttention) return -1;
      if (!a.needsAttention && b.needsAttention) return 1;
      return b.daysListed - a.daysListed;
    });
  }),
});
