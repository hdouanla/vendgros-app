import { z } from "zod/v4";
import { and, desc, eq, gte } from "drizzle-orm";

import { listing, rating, reservation, user } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

// Middleware to check if user is admin
async function requireAdmin(ctx: any) {
  const currentUser = await ctx.db.query.user.findFirst({
    where: (users: any, { eq }: any) => eq(users.id, ctx.session.user.id),
  });

  if (!currentUser || currentUser.userType !== "ADMIN") {
    throw new Error("Admin access required");
  }
}

/**
 * Calculate eligibility for verification badges based on criteria
 */
async function calculateBadgeEligibility(userId: string, db: any) {
  // Get user data
  const userData = await db.query.user.findFirst({
    where: (users: any, { eq }: any) => eq(users.id, userId),
  });

  if (!userData) {
    throw new Error("User not found");
  }

  // Get seller listings
  const listings = await db.query.listing.findMany({
    where: (listings: any, { eq }: any) => eq(listings.sellerId, userId),
  });

  // Get completed transactions
  const completedListings = listings.filter((l: any) => l.status === "COMPLETED");
  const publishedListings = listings.filter((l: any) => l.status === "PUBLISHED");

  // Get all reservations for seller's listings
  const allReservations = await Promise.all(
    listings.map(async (l: any) =>
      db.query.reservation.findMany({
        where: (reservations: any, { eq }: any) =>
          eq(reservations.listingId, l.id),
      }),
    ),
  );

  const flatReservations = allReservations.flat();
  const completedReservations = flatReservations.filter(
    (r: any) => r.status === "COMPLETED",
  );
  const noShowCount = flatReservations.filter((r: any) => r.status === "NO_SHOW").length;

  // Calculate total revenue
  const totalRevenue = completedReservations.reduce(
    (sum: number, r: any) => sum + r.totalPrice,
    0,
  );

  // Get ratings
  const ratings = await db.query.rating.findMany({
    where: (ratings: any, { eq }: any) => eq(ratings.ratedId, userId),
  });

  // Calculate account age in days
  const accountAgeMs = Date.now() - new Date(userData.createdAt).getTime();
  const accountAgeDays = Math.floor(accountAgeMs / (24 * 60 * 60 * 1000));

  // Calculate no-show rate
  const noShowRate =
    flatReservations.length > 0 ? noShowCount / flatReservations.length : 0;

  // Criteria for badges
  const criteria = {
    verified: {
      minTransactions: 5,
      minRating: 4.0,
      minRatingCount: 3,
      maxNoShowRate: 0.1,
      minAccountAgeDays: 7,
      eligible: false,
      missing: [] as string[],
    },
    trusted: {
      minTransactions: 20,
      minRating: 4.5,
      minRatingCount: 10,
      maxNoShowRate: 0.05,
      minAccountAgeDays: 30,
      minRevenue: 500,
      eligible: false,
      missing: [] as string[],
    },
    premium: {
      minTransactions: 50,
      minRating: 4.7,
      minRatingCount: 25,
      maxNoShowRate: 0.02,
      minAccountAgeDays: 90,
      minRevenue: 2000,
      identityVerified: true,
      eligible: false,
      missing: [] as string[],
    },
  };

  // Check VERIFIED eligibility
  if (completedReservations.length < criteria.verified.minTransactions) {
    criteria.verified.missing.push(
      `Need ${criteria.verified.minTransactions - completedReservations.length} more completed transactions`,
    );
  }
  if (userData.ratingAverage < criteria.verified.minRating) {
    criteria.verified.missing.push(
      `Need rating of ${criteria.verified.minRating}+ (currently ${userData.ratingAverage?.toFixed(1) ?? "0.0"})`,
    );
  }
  if (userData.ratingCount < criteria.verified.minRatingCount) {
    criteria.verified.missing.push(
      `Need ${criteria.verified.minRatingCount - userData.ratingCount} more ratings`,
    );
  }
  if (noShowRate > criteria.verified.maxNoShowRate) {
    criteria.verified.missing.push(
      `No-show rate too high (${(noShowRate * 100).toFixed(1)}%, max ${criteria.verified.maxNoShowRate * 100}%)`,
    );
  }
  if (accountAgeDays < criteria.verified.minAccountAgeDays) {
    criteria.verified.missing.push(
      `Account too new (${accountAgeDays} days, need ${criteria.verified.minAccountAgeDays}+)`,
    );
  }

  criteria.verified.eligible = criteria.verified.missing.length === 0;

  // Check TRUSTED eligibility
  if (completedReservations.length < criteria.trusted.minTransactions) {
    criteria.trusted.missing.push(
      `Need ${criteria.trusted.minTransactions - completedReservations.length} more completed transactions`,
    );
  }
  if (userData.ratingAverage < criteria.trusted.minRating) {
    criteria.trusted.missing.push(
      `Need rating of ${criteria.trusted.minRating}+ (currently ${userData.ratingAverage?.toFixed(1) ?? "0.0"})`,
    );
  }
  if (userData.ratingCount < criteria.trusted.minRatingCount) {
    criteria.trusted.missing.push(
      `Need ${criteria.trusted.minRatingCount - userData.ratingCount} more ratings`,
    );
  }
  if (noShowRate > criteria.trusted.maxNoShowRate) {
    criteria.trusted.missing.push(
      `No-show rate too high (${(noShowRate * 100).toFixed(1)}%, max ${criteria.trusted.maxNoShowRate * 100}%)`,
    );
  }
  if (accountAgeDays < criteria.trusted.minAccountAgeDays) {
    criteria.trusted.missing.push(
      `Account too new (${accountAgeDays} days, need ${criteria.trusted.minAccountAgeDays}+)`,
    );
  }
  if (totalRevenue < criteria.trusted.minRevenue) {
    criteria.trusted.missing.push(
      `Need $${(criteria.trusted.minRevenue - totalRevenue).toFixed(2)} more revenue`,
    );
  }

  criteria.trusted.eligible = criteria.trusted.missing.length === 0;

  // Check PREMIUM eligibility
  if (completedReservations.length < criteria.premium.minTransactions) {
    criteria.premium.missing.push(
      `Need ${criteria.premium.minTransactions - completedReservations.length} more completed transactions`,
    );
  }
  if (userData.ratingAverage < criteria.premium.minRating) {
    criteria.premium.missing.push(
      `Need rating of ${criteria.premium.minRating}+ (currently ${userData.ratingAverage?.toFixed(1) ?? "0.0"})`,
    );
  }
  if (userData.ratingCount < criteria.premium.minRatingCount) {
    criteria.premium.missing.push(
      `Need ${criteria.premium.minRatingCount - userData.ratingCount} more ratings`,
    );
  }
  if (noShowRate > criteria.premium.maxNoShowRate) {
    criteria.premium.missing.push(
      `No-show rate too high (${(noShowRate * 100).toFixed(1)}%, max ${criteria.premium.maxNoShowRate * 100}%)`,
    );
  }
  if (accountAgeDays < criteria.premium.minAccountAgeDays) {
    criteria.premium.missing.push(
      `Account too new (${accountAgeDays} days, need ${criteria.premium.minAccountAgeDays}+)`,
    );
  }
  if (totalRevenue < criteria.premium.minRevenue) {
    criteria.premium.missing.push(
      `Need $${(criteria.premium.minRevenue - totalRevenue).toFixed(2)} more revenue`,
    );
  }
  if (!userData.identityVerified) {
    criteria.premium.missing.push("Identity verification required");
  }

  criteria.premium.eligible = criteria.premium.missing.length === 0;

  return {
    currentBadge: userData.verificationBadge,
    stats: {
      completedTransactions: completedReservations.length,
      rating: userData.ratingAverage,
      ratingCount: userData.ratingCount,
      noShowRate,
      accountAgeDays,
      totalRevenue,
      identityVerified: userData.identityVerified,
    },
    eligibility: criteria,
  };
}

export const verificationRouter = createTRPCRouter({
  /**
   * Check seller's badge eligibility
   */
  checkEligibility: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return await calculateBadgeEligibility(userId, ctx.db);
  }),

  /**
   * Request identity verification
   */
  requestIdentityVerification: protectedProcedure
    .input(
      z.object({
        method: z.enum(["government_id", "business_license", "other"]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // In production, this would trigger an admin review process
      // For now, we just save the request

      const [updated] = await ctx.db
        .update(user)
        .set({
          identityVerificationMethod: input.method,
          identityVerificationNotes: input.notes,
        })
        .where(eq(user.id, userId))
        .returning();

      return {
        success: true,
        message:
          "Identity verification request submitted. An admin will review your request within 48 hours.",
      };
    }),

  /**
   * Apply for badge upgrade (automated check)
   */
  applyForBadge: protectedProcedure
    .input(
      z.object({
        targetBadge: z.enum(["VERIFIED", "TRUSTED", "PREMIUM"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const eligibility = await calculateBadgeEligibility(userId, ctx.db);

      const targetBadge = input.targetBadge.toLowerCase() as
        | "verified"
        | "trusted"
        | "premium";

      if (!eligibility.eligibility[targetBadge].eligible) {
        throw new Error(
          `Not eligible for ${input.targetBadge} badge. Missing requirements: ${eligibility.eligibility[targetBadge].missing.join(", ")}`,
        );
      }

      // Automatically grant badge if eligible
      const [updated] = await ctx.db
        .update(user)
        .set({
          verificationBadge: input.targetBadge,
        })
        .where(eq(user.id, userId))
        .returning();

      return {
        success: true,
        badge: updated?.verificationBadge,
        message: `Congratulations! You've been awarded the ${input.targetBadge} badge.`,
      };
    }),

  /**
   * Admin: Manually verify a seller's identity
   */
  adminVerifyIdentity: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        verified: z.boolean(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const [updated] = await ctx.db
        .update(user)
        .set({
          identityVerified: input.verified,
          identityVerificationNotes: input.notes,
        })
        .where(eq(user.id, input.userId))
        .returning();

      return {
        success: true,
        user: updated,
      };
    }),

  /**
   * Admin: Manually assign/revoke badge
   */
  adminAssignBadge: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        badge: z.enum(["NONE", "VERIFIED", "TRUSTED", "PREMIUM"]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const [updated] = await ctx.db
        .update(user)
        .set({
          verificationBadge: input.badge,
          moderationNotes: input.notes,
        })
        .where(eq(user.id, input.userId))
        .returning();

      return {
        success: true,
        user: updated,
      };
    }),

  /**
   * Admin: Get pending identity verification requests
   */
  adminGetPendingVerifications: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx);

    const pendingUsers = await ctx.db.query.user.findMany({
      where: (users, { and, eq, isNotNull }) =>
        and(
          isNotNull(users.identityVerificationMethod),
          eq(users.identityVerified, false),
        ),
      limit: 50,
    });

    return pendingUsers;
  }),

  /**
   * Get badge criteria/requirements (public)
   */
  getBadgeCriteria: protectedProcedure.query(async ({ ctx }) => {
    return {
      verified: {
        name: "Verified Seller",
        description: "New sellers who have completed their first successful transactions",
        requirements: [
          "5+ completed transactions",
          "4.0+ average rating",
          "3+ customer reviews",
          "Less than 10% no-show rate",
          "Account active for 7+ days",
        ],
        benefits: [
          "Verified badge on profile and listings",
          "Increased buyer trust",
          "Priority in search results",
        ],
      },
      trusted: {
        name: "Trusted Seller",
        description: "Experienced sellers with consistent quality and reliability",
        requirements: [
          "20+ completed transactions",
          "4.5+ average rating",
          "10+ customer reviews",
          "Less than 5% no-show rate",
          "Account active for 30+ days",
          "$500+ total revenue",
        ],
        benefits: [
          "Trusted badge (blue checkmark)",
          "Featured in trusted sellers section",
          "Higher visibility in search",
          "Access to analytics tools",
        ],
      },
      premium: {
        name: "Premium Seller",
        description: "Top-tier sellers with exceptional track record and verified identity",
        requirements: [
          "50+ completed transactions",
          "4.7+ average rating",
          "25+ customer reviews",
          "Less than 2% no-show rate",
          "Account active for 90+ days",
          "$2,000+ total revenue",
          "Identity verification required",
        ],
        benefits: [
          "Premium badge (gold star)",
          "Top placement in search results",
          "Featured on homepage",
          "Priority customer support",
          "Reduced platform fees (future)",
          "Early access to new features",
        ],
      },
    };
  }),
});
