import { z } from "zod/v4";
import { and, eq, inArray, sql } from "@acme/db";
import { listing, listingFavorite, user } from "@acme/db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const favoriteRouter = createTRPCRouter({
  // Toggle favorite on a listing (add/remove)
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

      // Check if user already favorited
      const existingFavorite = await ctx.db.query.listingFavorite.findFirst({
        where: (favorites, { and, eq }) =>
          and(
            eq(favorites.listingId, input.listingId),
            eq(favorites.userId, userId),
          ),
      });

      if (existingFavorite) {
        // Remove from favorites
        await ctx.db.delete(listingFavorite).where(eq(listingFavorite.id, existingFavorite.id));
        return { favorited: false };
      } else {
        // Add to favorites
        await ctx.db.insert(listingFavorite).values({
          listingId: input.listingId,
          userId,
        });
        return { favorited: true };
      }
    }),

  // Check if current user favorited a listing
  isFavorited: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const existingFavorite = await ctx.db.query.listingFavorite.findFirst({
        where: (favorites, { and, eq }) =>
          and(
            eq(favorites.listingId, input.listingId),
            eq(favorites.userId, ctx.session.user.id),
          ),
      });

      return { isFavorited: !!existingFavorite };
    }),

  // Batch check if user favorited multiple listings (for list views)
  batchIsFavorited: protectedProcedure
    .input(z.object({ listingIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      if (input.listingIds.length === 0) {
        return { favoritedIds: [] };
      }

      const favorites = await ctx.db.query.listingFavorite.findMany({
        where: (favorites, { and, eq, inArray }) =>
          and(
            inArray(favorites.listingId, input.listingIds),
            eq(favorites.userId, ctx.session.user.id),
          ),
        columns: {
          listingId: true,
        },
      });

      return { favoritedIds: favorites.map((fav) => fav.listingId) };
    }),

  // Get user's favorited listings
  myFavorites: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const favorites = await ctx.db.query.listingFavorite.findMany({
        where: (favorites, { eq }) => eq(favorites.userId, ctx.session.user.id),
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
        orderBy: (favorites, { desc }) => [desc(favorites.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      // Filter out favorites where listing might be null (deleted listings)
      const validFavorites = favorites.filter((fav) => fav.listing !== null);

      // Count total favorited listings
      const totalCount = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(listingFavorite)
        .where(eq(listingFavorite.userId, ctx.session.user.id));

      return {
        listings: validFavorites.map((fav) => ({
          ...fav.listing,
          favoritedAt: fav.createdAt,
        })),
        total: Number(totalCount[0]?.count ?? 0),
        hasMore: input.offset + input.limit < Number(totalCount[0]?.count ?? 0),
      };
    }),

  // Get favorites count for current user
  getCount: protectedProcedure.query(async ({ ctx }) => {
    const totalCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(listingFavorite)
      .where(eq(listingFavorite.userId, ctx.session.user.id));

    return { count: Number(totalCount[0]?.count ?? 0) };
  }),
});
