import { z } from "zod/v4";
import { and, eq, inArray, sql } from "@acme/db";
import { listing, listingLike, user } from "@acme/db/schema";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { cache } from "../lib/cache";

export const likeRouter = createTRPCRouter({
  // Toggle like on a listing (like/unlike)
  toggle: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if listing exists
      const existingListing = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
      });

      if (!existingListing) {
        throw new Error("Listing not found");
      }

      // Check if user already liked
      const existingLike = await ctx.db.query.listingLike.findFirst({
        where: (likes, { and, eq }) =>
          and(
            eq(likes.listingId, input.listingId),
            eq(likes.userId, userId),
          ),
      });

      if (existingLike) {
        // Unlike: Remove the like and decrement count
        await ctx.db.delete(listingLike).where(eq(listingLike.id, existingLike.id));

        // Decrement likes count (ensure it doesn't go below 0)
        await ctx.db
          .update(listing)
          .set({
            likesCount: sql`GREATEST(${listing.likesCount} - 1, 0)`,
          })
          .where(eq(listing.id, input.listingId));

        // Invalidate listings cache so updated likesCount is reflected
        await cache.invalidatePrefix("listings:");

        return { liked: false, likesCount: Math.max(existingListing.likesCount - 1, 0) };
      } else {
        // Like: Add the like and increment count
        await ctx.db.insert(listingLike).values({
          listingId: input.listingId,
          userId,
        });

        // Increment likes count
        await ctx.db
          .update(listing)
          .set({
            likesCount: sql`${listing.likesCount} + 1`,
          })
          .where(eq(listing.id, input.listingId));

        // Invalidate listings cache so updated likesCount is reflected
        await cache.invalidatePrefix("listings:");

        return { liked: true, likesCount: existingListing.likesCount + 1 };
      }
    }),

  // Check if current user liked a listing
  isLiked: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const existingLike = await ctx.db.query.listingLike.findFirst({
        where: (likes, { and, eq }) =>
          and(
            eq(likes.listingId, input.listingId),
            eq(likes.userId, ctx.session.user.id),
          ),
      });

      return { isLiked: !!existingLike };
    }),

  // Batch check if user liked multiple listings (for list views)
  batchIsLiked: protectedProcedure
    .input(z.object({ listingIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      if (input.listingIds.length === 0) {
        return { likedIds: [] };
      }

      const likes = await ctx.db.query.listingLike.findMany({
        where: (likes, { and, eq, inArray }) =>
          and(
            inArray(likes.listingId, input.listingIds),
            eq(likes.userId, ctx.session.user.id),
          ),
        columns: {
          listingId: true,
        },
      });

      return { likedIds: likes.map((like) => like.listingId) };
    }),

  // Get user's liked listings
  myLikedListings: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const likes = await ctx.db.query.listingLike.findMany({
        where: (likes, { eq }) => eq(likes.userId, ctx.session.user.id),
        with: {
          listing: {
            with: {
              seller: {
                columns: {
                  id: true,
                  name: true,
                  sellerRatingAverage: true,
                  sellerRatingCount: true,
                  ratingAverage: true,
                  ratingCount: true,
                },
              },
            },
          },
        },
        orderBy: (likes, { desc }) => [desc(likes.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      // Filter out likes where listing might be null (deleted listings)
      const validLikes = likes.filter((like) => like.listing !== null);

      // Count total liked listings
      const totalCount = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(listingLike)
        .where(eq(listingLike.userId, ctx.session.user.id));

      return {
        listings: validLikes.map((like) => ({
          ...like.listing,
          likedAt: like.createdAt,
        })),
        total: Number(totalCount[0]?.count ?? 0),
        hasMore: input.offset + input.limit < Number(totalCount[0]?.count ?? 0),
      };
    }),

  // Get like count for a listing (public)
  getLikeCount: publicProcedure
    .input(z.object({ listingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.listing.findFirst({
        where: (listings, { eq }) => eq(listings.id, input.listingId),
        columns: {
          likesCount: true,
        },
      });

      return { likesCount: result?.likesCount ?? 0 };
    }),
});
