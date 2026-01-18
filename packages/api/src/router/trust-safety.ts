import { z } from "zod/v4";
import { and, desc, eq, gte, sql } from "drizzle-orm";

import { listing, rating, reservation, user } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  analyzeBehavior,
  checkReviewAuthenticity,
  detectFraud,
  predictNoShow,
} from "../services/trust-safety";

// Middleware to check if user is admin
async function requireAdmin(ctx: any) {
  const currentUser = await ctx.db.query.user.findFirst({
    where: (users: any, { eq }: any) => eq(users.id, ctx.session.user.id),
  });

  if (!currentUser || !currentUser.isAdmin) {
    throw new Error("Admin access required");
  }
}

export const trustSafetyRouter = createTRPCRouter({
  /**
   * Run fraud detection on a user
   */
  scanUserForFraud: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      // Gather user metrics
      const userData = await ctx.db.query.user.findFirst({
        where: (users: any, { eq }: any) => eq(users.id, input.userId),
      });

      if (!userData) {
        throw new Error("User not found");
      }

      // Get seller listings
      const listings = await ctx.db.query.listing.findMany({
        where: (listings: any, { eq }: any) => eq(listings.sellerId, input.userId),
      });

      // Get all reservations
      const allReservations = await Promise.all(
        listings.map(async (l: any) =>
          ctx.db.query.reservation.findMany({
            where: (reservations: any, { eq }: any) => eq(reservations.listingId, l.id),
          }),
        ),
      );

      const flatReservations = allReservations.flat();
      const completedReservations = flatReservations.filter(
        (r: any) => r.status === "COMPLETED",
      );
      const cancelledReservations = flatReservations.filter(
        (r: any) => r.status === "CANCELLED",
      );
      const noShowCount = flatReservations.filter(
        (r: any) => r.status === "NO_SHOW",
      ).length;

      // Calculate metrics
      const accountAgeMs = Date.now() - new Date(userData.createdAt).getTime();
      const accountAgeDays = Math.floor(accountAgeMs / (24 * 60 * 60 * 1000));

      const avgListingPrice =
        listings.reduce((sum: number, l: any) => sum + l.pricePerPiece, 0) /
        (listings.length || 1);

      // Check for recent activity spike
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentListings = listings.filter(
        (l: any) => new Date(l.createdAt) > last7Days,
      );
      const recentActivitySpike =
        recentListings.length > listings.length * 0.5 && listings.length > 5;

      // TODO: Implement multi-account detection (would need IP tracking, device fingerprinting)
      const multipleAccountsDetected = false;

      // TODO: Implement payment failure tracking
      const paymentFailures = 0;

      // TODO: Implement user reporting system
      const reportedByOthers = 0;

      const fraudResult = await detectFraud({
        userId: input.userId,
        userEmail: userData.email,
        userPhone: userData.phone ?? "",
        accountAge: accountAgeDays,
        listingsCount: listings.length,
        completedTransactions: completedReservations.length,
        cancelledTransactions: cancelledReservations.length,
        noShowCount,
        averageListingPrice: avgListingPrice,
        recentActivitySpike,
        multipleAccountsDetected,
        paymentFailures,
        reportedByOthers,
      });

      // Update user trust score in database
      await ctx.db
        .update(user)
        .set({
          fraudRiskScore: fraudResult.riskScore,
          fraudFlags: fraudResult.riskFactors,
          lastFraudCheckAt: new Date(),
        })
        .where(eq(user.id, input.userId));

      return {
        userId: input.userId,
        fraudResult,
        userData: {
          email: userData.email,
          accountAge: accountAgeDays,
          completedTransactions: completedReservations.length,
        },
      };
    }),

  /**
   * Analyze user behavior patterns
   */
  analyzeUserBehavior: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Can be called by user themselves or admin
      if (
        ctx.session.user.id !== input.userId &&
        !(await isAdmin(ctx, ctx.session.user.id))
      ) {
        throw new Error("Not authorized");
      }

      const userData = await ctx.db.query.user.findFirst({
        where: (users: any, { eq }: any) => eq(users.id, input.userId),
      });

      if (!userData) {
        throw new Error("User not found");
      }

      // Get listings
      const listings = await ctx.db.query.listing.findMany({
        where: (listings: any, { eq }: any) => eq(listings.sellerId, input.userId),
      });

      const activeListings = listings.filter((l: any) => l.status === "PUBLISHED");

      // Get reservations
      const allReservations = await Promise.all(
        listings.map(async (l: any) =>
          ctx.db.query.reservation.findMany({
            where: (reservations: any, { eq }: any) => eq(reservations.listingId, l.id),
          }),
        ),
      );

      const flatReservations = allReservations.flat();
      const completedReservations = flatReservations.filter(
        (r: any) => r.status === "COMPLETED",
      );
      const cancelledByUser = flatReservations.filter(
        (r: any) => r.status === "CANCELLED",
      ).length;

      // Calculate account age
      const accountAgeMs = Date.now() - new Date(userData.createdAt).getTime();
      const accountAgeDays = Math.floor(accountAgeMs / (24 * 60 * 60 * 1000));

      // TODO: Track actual response times (would need message timestamps)
      const averageResponseTime = 120; // Mock: 2 hours

      // Calculate price variance
      const prices = listings.map((l: any) => l.pricePerPiece);
      const avgPrice = prices.reduce((sum: number, p: number) => sum + p, 0) / (prices.length || 1);
      const priceVariance =
        prices.reduce((sum: number, p: number) => sum + Math.abs(p - avgPrice), 0) /
        (prices.length || 1) /
        (avgPrice || 1);

      // Calculate listing update frequency
      // TODO: Track listing edits (would need edit history)
      const listingUpdateFrequency = 0.5; // Mock: 0.5 updates per day

      const behaviorResult = await analyzeBehavior({
        userId: input.userId,
        accountAge: accountAgeDays,
        totalListings: listings.length,
        activeListings: activeListings.length,
        completedTransactions: completedReservations.length,
        cancelledByUser,
        averageResponseTime,
        ratingAverage: userData.ratingAverage ?? 0,
        ratingCount: userData.ratingCount ?? 0,
        priceVariance,
        listingUpdateFrequency,
      });

      // Update user trust score in database
      await ctx.db
        .update(user)
        .set({
          trustScore: behaviorResult.trustScore,
          behaviorFlags: behaviorResult.behaviorFlags,
          lastBehaviorCheckAt: new Date(),
        })
        .where(eq(user.id, input.userId));

      return {
        userId: input.userId,
        behaviorResult,
        accountMetrics: {
          accountAge: accountAgeDays,
          totalListings: listings.length,
          completedTransactions: completedReservations.length,
        },
      };
    }),

  /**
   * Predict no-show probability for a reservation
   */
  predictNoShowRisk: protectedProcedure
    .input(
      z.object({
        reservationId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const reservationData = await ctx.db.query.reservation.findFirst({
        where: (reservations: any, { eq }: any) => eq(reservations.id, input.reservationId),
        with: {
          listing: {
            with: {
              seller: true,
            },
          },
          buyer: true,
        },
      });

      if (!reservationData) {
        throw new Error("Reservation not found");
      }

      // Only seller, buyer, or admin can check
      const isSeller = reservationData.listing.sellerId === ctx.session.user.id;
      const isBuyer = reservationData.buyerId === ctx.session.user.id;
      const isAdminUser = await isAdmin(ctx, ctx.session.user.id);

      if (!isSeller && !isBuyer && !isAdminUser) {
        throw new Error("Not authorized");
      }

      // Determine which user to analyze (buyer for seller's perspective, seller for buyer's)
      const userToAnalyze = isSeller ? reservationData.buyer : reservationData.listing.seller;
      const userType = isSeller ? "buyer" : "seller";

      // Get user's historical reservations
      const userReservations = await ctx.db.query.reservation.findMany({
        where: (reservations: any, { eq }: any) =>
          userType === "buyer"
            ? eq(reservations.buyerId, userToAnalyze.id)
            : eq(reservations.listingId, input.reservationId),
      });

      const historicalNoShows = userReservations.filter(
        (r: any) => r.status === "NO_SHOW",
      ).length;
      const totalTransactions = userReservations.filter(
        (r: any) => r.status === "COMPLETED" || r.status === "NO_SHOW",
      ).length;

      const accountAgeMs = Date.now() - new Date(userToAnalyze.createdAt).getTime();
      const accountAgeDays = Math.floor(accountAgeMs / (24 * 60 * 60 * 1000));

      // Calculate pickup time details
      const pickupTime = new Date(); // TODO: Get actual pickup time from reservation
      const timeOfDay = pickupTime.getHours();
      const dayOfWeek = pickupTime.getDay();

      // Calculate distance (would need to geocode both addresses)
      const distanceKm = 10; // Mock: 10km

      const prediction = await predictNoShow({
        userId: userToAnalyze.id,
        userType,
        historicalNoShows,
        totalTransactions,
        accountAge: accountAgeDays,
        ratingAverage: userToAnalyze.ratingAverage ?? 0,
        timeOfDay,
        dayOfWeek,
        distanceKm,
        itemValue: reservationData.totalPrice,
        depositAmount: reservationData.depositAmount,
        isFirstTransaction: totalTransactions === 0,
        responseTimeBefore: 120, // Mock: 2 hours since last message
      });

      return {
        reservationId: input.reservationId,
        prediction,
        userAnalyzed: {
          id: userToAnalyze.id,
          type: userType,
          historicalNoShows,
          totalTransactions,
        },
      };
    }),

  /**
   * Check review authenticity
   */
  checkReviewAuthenticity: protectedProcedure
    .input(
      z.object({
        ratingId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const ratingData = await ctx.db.query.rating.findFirst({
        where: (ratings: any, { eq }: any) => eq(ratings.id, input.ratingId),
        with: {
          rater: true,
          reservation: true,
        },
      });

      if (!ratingData) {
        throw new Error("Rating not found");
      }

      // Get reviewer's transaction history
      const reviewerReservations = await ctx.db.query.reservation.findMany({
        where: (reservations: any, { eq }: any) =>
          eq(reservations.buyerId, ratingData.raterId),
      });

      const reviewerTransactionCount = reviewerReservations.filter(
        (r: any) => r.status === "COMPLETED",
      ).length;

      const accountAgeMs = Date.now() - new Date(ratingData.rater.createdAt).getTime();
      const accountAgeDays = Math.floor(accountAgeMs / (24 * 60 * 60 * 1000));

      // Calculate time to review
      const completedAt = ratingData.reservation.completedAt ?? new Date();
      const reviewedAt = ratingData.createdAt;
      const timeToReviewMs = reviewedAt.getTime() - completedAt.getTime();
      const timeToReviewHours = timeToReviewMs / (60 * 60 * 1000);

      const authenticityResult = await checkReviewAuthenticity({
        reviewText: ratingData.comment ?? "",
        rating: ratingData.score,
        reviewerId: ratingData.raterId,
        reviewerTransactionCount,
        reviewerAccountAge: accountAgeDays,
        timeToReview: timeToReviewHours,
        reviewLength: (ratingData.comment ?? "").length,
        reviewedUserId: ratingData.ratedId,
      });

      // Update rating with authenticity check
      await ctx.db
        .update(rating)
        .set({
          authenticityScore: authenticityResult.confidence,
          authenticityFlags: authenticityResult.suspicionReasons,
          aiGenerated: authenticityResult.aiGenerated,
          lastAuthenticityCheckAt: new Date(),
        })
        .where(eq(rating.id, input.ratingId));

      return {
        ratingId: input.ratingId,
        authenticityResult,
        ratingData: {
          score: ratingData.score,
          comment: ratingData.comment,
          reviewerId: ratingData.raterId,
        },
      };
    }),

  /**
   * Get high-risk users (admin only)
   */
  getHighRiskUsers: protectedProcedure
    .input(
      z.object({
        minRiskScore: z.number().min(0).max(1).default(0.6),
        limit: z.number().max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const highRiskUsers = await ctx.db.query.user.findMany({
        where: (users, { gte, isNotNull, and }) =>
          and(
            gte(users.fraudRiskScore, input.minRiskScore),
            isNotNull(users.fraudRiskScore),
          ),
        orderBy: (users, { desc }) => [desc(users.fraudRiskScore)],
        limit: input.limit,
      });

      return highRiskUsers.map((user: any) => ({
        id: user.id,
        email: user.email,
        fraudRiskScore: user.fraudRiskScore,
        fraudFlags: user.fraudFlags,
        trustScore: user.trustScore,
        lastFraudCheckAt: user.lastFraudCheckAt,
        accountStatus: user.accountStatus,
      }));
    }),

  /**
   * Get suspicious reviews (admin only)
   */
  getSuspiciousReviews: protectedProcedure
    .input(
      z.object({
        maxAuthenticityScore: z.number().min(0).max(1).default(0.7),
        limit: z.number().max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const suspiciousReviews = await ctx.db.query.rating.findMany({
        where: (ratings, { lte, isNotNull, and }) =>
          and(
            lte(ratings.authenticityScore, input.maxAuthenticityScore),
            isNotNull(ratings.authenticityScore),
          ),
        orderBy: (ratings, { asc }) => [asc(ratings.authenticityScore)],
        limit: input.limit,
        with: {
          rater: {
            columns: {
              id: true,
              email: true,
            },
          },
          rated: {
            columns: {
              id: true,
              email: true,
            },
          },
        },
      });

      return suspiciousReviews.map((review: any) => ({
        id: review.id,
        score: review.score,
        comment: review.comment,
        authenticityScore: review.authenticityScore,
        authenticityFlags: review.authenticityFlags,
        aiGenerated: review.aiGenerated,
        rater: review.rater,
        rated: review.rated,
        createdAt: review.createdAt,
      }));
    }),

  /**
   * Get trust & safety dashboard stats (admin only)
   */
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx);

    // Count high-risk users
    const highRiskCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(gte(user.fraudRiskScore, 0.7));

    // Count suspicious reviews
    const suspiciousReviewCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(rating)
      .where(
        and(sql`${rating.authenticityScore} IS NOT NULL`, sql`${rating.authenticityScore} < 0.7`),
      );

    // Count no-show reservations
    const noShowCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(reservation)
      .where(eq(reservation.status, "NO_SHOW"));

    // Get average trust score
    const avgTrustScore = await ctx.db
      .select({ avg: sql<number>`avg(${user.trustScore})` })
      .from(user)
      .where(sql`${user.trustScore} IS NOT NULL`);

    return {
      highRiskUsers: highRiskCount[0]?.count ?? 0,
      suspiciousReviews: suspiciousReviewCount[0]?.count ?? 0,
      noShowReservations: noShowCount[0]?.count ?? 0,
      averageTrustScore: avgTrustScore[0]?.avg ?? 0,
      lastUpdated: new Date(),
    };
  }),
});

/**
 * Helper to check if user is admin
 */
async function isAdmin(ctx: any, userId: string): Promise<boolean> {
  const user = await ctx.db.query.user.findFirst({
    where: (users: any, { eq }: any) => eq(users.id, userId),
  });
  return user?.isAdmin === true;
}
