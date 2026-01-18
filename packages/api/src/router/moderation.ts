import { z } from "zod/v4";
import { and, desc, eq, gte } from "drizzle-orm";

import { listing, user } from "@acme/db/schema";

import {
  detectSuspiciousPatterns,
  moderateListing,
} from "../services/ai-moderation";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Middleware to check if user is admin
async function requireAdmin(ctx: any) {
  const currentUser = await ctx.db.query.user.findFirst({
    where: (users: any, { eq }: any) => eq(users.id, ctx.session.user.id),
  });

  if (!currentUser || !currentUser.isAdmin) {
    throw new Error("Admin access required");
  }
}

export const moderationRouter = createTRPCRouter({
  /**
   * Run AI moderation on a listing
   * This can be called by admins or automatically during submission
   */
  runAIModeration: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the listing
      const listingData = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
        with: {
          seller: {
            columns: {
              id: true,
              ratingAverage: true,
              createdAt: true,
            },
          },
        },
      });

      if (!listingData) {
        throw new Error("Listing not found");
      }

      // Check if user is seller or admin
      const isOwner = listingData.sellerId === ctx.session.user.id;
      const currentUser = await ctx.db.query.user.findFirst({
        where: (users: any, { eq }: any) => eq(users.id, ctx.session.user.id),
      });
      const isAdmin = currentUser?.isAdmin === true;

      if (!isOwner && !isAdmin) {
        throw new Error("Not authorized");
      }

      // Get seller's recent listings count
      const sellerListings = await ctx.db.query.listing.findMany({
        where: (listings, { eq }) => eq(listings.sellerId, listingData.sellerId),
        columns: {
          id: true,
        },
      });

      // Run AI moderation
      const moderationResult = await moderateListing({
        listingId: input.listingId,
        title: listingData.title,
        description: listingData.description,
        category: listingData.category,
        imageUrls: listingData.photos,
        sellerRating: listingData.seller.ratingAverage ?? undefined,
        sellerListingsCount: sellerListings.length,
      });

      // Update listing with moderation results
      const [updated] = await ctx.db
        .update(listing)
        .set({
          aiModerationScore: moderationResult.confidence,
          aiModerationFlags: moderationResult.flaggedReasons,
          aiModeratedAt: new Date(),
          // Auto-approve if AI is confident and no flags
          status: moderationResult.approved ? "PUBLISHED" : listingData.status,
          publishedAt: moderationResult.approved ? new Date() : listingData.publishedAt,
        })
        .where(eq(listing.id, input.listingId))
        .returning();

      return {
        listing: updated,
        moderationResult,
      };
    }),

  /**
   * Check seller for suspicious patterns (fraud detection)
   */
  checkSellerPatterns: protectedProcedure
    .input(z.object({ sellerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      const seller = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, input.sellerId),
      });

      if (!seller) {
        throw new Error("Seller not found");
      }

      // Get recent listings (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentListings = await ctx.db.query.listing.findMany({
        where: (listings, { eq, gte }) =>
          and(
            eq(listings.sellerId, input.sellerId),
            gte(listings.createdAt, thirtyDaysAgo),
          ),
        columns: {
          title: true,
          description: true,
          pricePerPiece: true,
        },
      });

      // Calculate account age in days
      const accountAgeMs = Date.now() - new Date(seller.createdAt).getTime();
      const accountAgeDays = Math.floor(accountAgeMs / (24 * 60 * 60 * 1000));

      // Run fraud detection
      const suspicionResult = await detectSuspiciousPatterns({
        sellerId: input.sellerId,
        recentListings,
        accountAge: accountAgeDays,
      });

      return {
        seller: {
          id: seller.id,
          email: seller.email,
          accountAge: accountAgeDays,
          ratingAverage: seller.ratingAverage,
        },
        suspicionResult,
        recentListingsCount: recentListings.length,
      };
    }),

  /**
   * Get moderation queue with AI scores
   */
  getModerationQueue: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        filter: z.enum(["all", "ai_approved", "ai_flagged", "no_ai"]).default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      let whereCondition;

      if (input.filter === "ai_approved") {
        // AI approved (score >= 0.8)
        whereCondition = (listings: any, { eq, gte }: any) =>
          and(
            eq(listings.status, "PENDING_REVIEW"),
            gte(listings.aiModerationScore, 0.8),
          );
      } else if (input.filter === "ai_flagged") {
        // AI flagged (score < 0.5 or has flags)
        // Note: This is a simplified query. For array checks, you'd need raw SQL
        whereCondition = (listings: any, { eq }: any) =>
          eq(listings.status, "PENDING_REVIEW");
      } else if (input.filter === "no_ai") {
        // No AI moderation run yet
        whereCondition = (listings: any, { eq, isNull }: any) =>
          and(eq(listings.status, "PENDING_REVIEW"), isNull(listings.aiModeratedAt));
      } else {
        whereCondition = (listings: any, { eq }: any) =>
          eq(listings.status, "PENDING_REVIEW");
      }

      const results = await ctx.db.query.listing.findMany({
        where: whereCondition,
        with: {
          seller: {
            columns: {
              id: true,
              email: true,
              userType: true,
              ratingAverage: true,
              ratingCount: true,
            },
          },
        },
        orderBy: (listings, { desc }) => [desc(listings.aiModerationScore)],
        limit: input.limit,
        offset: input.offset,
      });

      return {
        listings: results,
        hasMore: results.length === input.limit,
      };
    }),

  /**
   * Bulk auto-approve listings with high AI scores
   */
  bulkAutoApprove: protectedProcedure
    .input(
      z.object({
        minScore: z.number().min(0).max(1).default(0.85),
        maxCount: z.number().max(100).default(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdmin(ctx);

      // Find all listings with high AI scores
      const candidates = await ctx.db.query.listing.findMany({
        where: (listings, { eq, gte, and }) =>
          and(
            eq(listings.status, "PENDING_REVIEW"),
            gte(listings.aiModerationScore, input.minScore),
          ),
        limit: input.maxCount,
      });

      // Filter out listings with flags
      const toApprove = candidates.filter(
        (l) => !l.aiModerationFlags || l.aiModerationFlags.length === 0,
      );

      // Bulk update
      const approvedCount = toApprove.length;
      for (const candidate of toApprove) {
        await ctx.db
          .update(listing)
          .set({
            status: "PUBLISHED",
            publishedAt: new Date(),
          })
          .where(eq(listing.id, candidate.id));
      }

      return {
        approvedCount,
        totalCandidates: candidates.length,
        approvedIds: toApprove.map((l) => l.id),
      };
    }),

  /**
   * Get AI moderation statistics
   */
  getModerationStats: protectedProcedure.query(async ({ ctx }) => {
    await requireAdmin(ctx);

    // Get counts
    const allListings = await ctx.db.query.listing.findMany({
      columns: {
        id: true,
        status: true,
        aiModerationScore: true,
        aiModerationFlags: true,
        aiModeratedAt: true,
      },
    });

    const totalListings = allListings.length;
    const aiModerated = allListings.filter((l) => l.aiModeratedAt).length;
    const autoApproved = allListings.filter(
      (l) => l.aiModeratedAt && l.status === "PUBLISHED",
    ).length;
    const flagged = allListings.filter(
      (l) => l.aiModerationFlags && l.aiModerationFlags.length > 0,
    ).length;

    const avgScore =
      allListings
        .filter((l) => l.aiModerationScore !== null)
        .reduce((sum, l) => sum + (l.aiModerationScore ?? 0), 0) /
      (aiModerated || 1);

    return {
      totalListings,
      aiModerated,
      aiModerationRate: totalListings > 0 ? aiModerated / totalListings : 0,
      autoApproved,
      autoApprovalRate: aiModerated > 0 ? autoApproved / aiModerated : 0,
      flagged,
      flagRate: aiModerated > 0 ? flagged / aiModerated : 0,
      avgModerationScore: avgScore,
    };
  }),
});
