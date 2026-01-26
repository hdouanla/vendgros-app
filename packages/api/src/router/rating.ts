import { z } from "zod/v4";
import { and, eq, sql } from "@acme/db";

import { rating, reservation, user } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const ratingRouter = createTRPCRouter({
  // Submit a rating (blind - hidden until both submit)
  submit: protectedProcedure
    .input(
      z.object({
        reservationId: z.string(),
        score: z.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingReservation = await ctx.db.query.reservation.findFirst({
        where: (reservations, { eq }) => eq(reservations.id, input.reservationId),
        with: {
          listing: true,
        },
      });

      if (!existingReservation) {
        throw new Error("Reservation not found");
      }

      if (existingReservation.status !== "COMPLETED") {
        throw new Error("Can only rate completed reservations");
      }

      // Determine if user is buyer or seller
      const isBuyer = existingReservation.buyerId === ctx.session.user.id;
      const isSeller =
        existingReservation.listing.sellerId === ctx.session.user.id;

      if (!isBuyer && !isSeller) {
        throw new Error("Not authorized to rate this reservation");
      }

      // Check if rating window is still open (7 days after completion)
      const ratingDeadline = new Date(
        existingReservation.completedAt!.getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      if (new Date() > ratingDeadline) {
        throw new Error("Rating window has expired");
      }

      // Check if user already rated
      const existingRating = await ctx.db.query.rating.findFirst({
        where: (ratings, { and, eq }) =>
          and(
            eq(ratings.reservationId, input.reservationId),
            eq(ratings.raterId, ctx.session.user.id),
          ),
      });

      const ratedId = isBuyer
        ? existingReservation.listing.sellerId
        : existingReservation.buyerId;

      // Determine the rating type based on who is being rated
      // If buyer is rating, they're rating the seller (AS_SELLER)
      // If seller is rating, they're rating the buyer (AS_BUYER)
      const ratingType = isBuyer ? "AS_SELLER" : "AS_BUYER";

      let newRating;

      if (existingRating) {
        // Update existing rating
        const [updatedRating] = await ctx.db
          .update(rating)
          .set({
            score: input.score,
            comment: input.comment ?? null,
            updatedAt: new Date(),
          })
          .where(eq(rating.id, existingRating.id))
          .returning();
        newRating = updatedRating;
      } else {
        // Create new rating
        const [createdRating] = await ctx.db
          .insert(rating)
          .values({
            reservationId: input.reservationId,
            raterId: ctx.session.user.id,
            ratedId,
            ratingType,
            score: input.score,
            comment: input.comment ?? null,
          })
          .returning();
        newRating = createdRating;
      }

      if (!newRating) {
        throw new Error("Failed to create rating");
      }

      // Check if both parties have rated
      const otherRating = await ctx.db.query.rating.findFirst({
        where: (ratings, { and, eq }) =>
          and(
            eq(ratings.reservationId, input.reservationId),
            eq(ratings.raterId, ratedId),
          ),
      });

      // If both rated, update user rating averages
      if (otherRating) {
        await updateUserRating(ctx.db, ratedId);
        await updateUserRating(ctx.db, ctx.session.user.id);
      }

      return {
        success: true,
        ratingId: newRating.id,
        bothRated: !!otherRating,
        wasUpdate: !!existingRating,
      };
    }),

  // Get ratings for a reservation (only visible if both rated or viewing own)
  getForReservation: protectedProcedure
    .input(z.object({ reservationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const existingReservation = await ctx.db.query.reservation.findFirst({
        where: (reservations, { eq }) => eq(reservations.id, input.reservationId),
        with: {
          listing: true,
        },
      });

      if (!existingReservation) {
        throw new Error("Reservation not found");
      }

      // Check authorization
      const isBuyer = existingReservation.buyerId === ctx.session.user.id;
      const isSeller =
        existingReservation.listing.sellerId === ctx.session.user.id;

      if (!isBuyer && !isSeller) {
        throw new Error("Not authorized");
      }

      const ratings = await ctx.db.query.rating.findMany({
        where: (ratings, { eq }) => eq(ratings.reservationId, input.reservationId),
        with: {
          rater: {
            columns: {
              id: true,
              email: true,
              userType: true,
              ratingAverage: true,
            },
          },
        },
      });

      // Both parties must rate for ratings to be visible
      const bothRated = ratings.length === 2;

      if (!bothRated) {
        // Only show user's own rating if they submitted one
        const ownRating = ratings.find((r) => r.raterId === ctx.session.user.id);
        return {
          bothRated: false,
          canRate: !ownRating && existingReservation.status === "COMPLETED",
          ownRating: ownRating
            ? {
                score: ownRating.score,
                comment: ownRating.comment,
                createdAt: ownRating.createdAt,
              }
            : null,
          otherRating: null,
        };
      }

      // Both rated - show all ratings
      const ownRating = ratings.find((r) => r.raterId === ctx.session.user.id);
      const otherRating = ratings.find((r) => r.raterId !== ctx.session.user.id);

      return {
        bothRated: true,
        canRate: false,
        ownRating: ownRating
          ? {
              score: ownRating.score,
              comment: ownRating.comment,
              createdAt: ownRating.createdAt,
            }
          : null,
        otherRating: otherRating
          ? {
              score: otherRating.score,
              comment: otherRating.comment,
              createdAt: otherRating.createdAt,
              rater: otherRating.rater,
            }
          : null,
      };
    }),

  // Get all ratings received by a user (public)
  getUserRatings: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        ratingType: z.enum(["AS_BUYER", "AS_SELLER"]).optional(), // Filter by rating type
        limit: z.number().default(20),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Only show ratings where both parties have rated
      const allRatings = await ctx.db.query.rating.findMany({
        where: (ratings, { eq }) => eq(ratings.ratedId, input.userId),
        with: {
          rater: {
            columns: {
              id: true,
              userType: true,
            },
          },
          reservation: {
            with: {
              listing: {
                columns: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: (ratings, { desc }) => [desc(ratings.createdAt)],
      });

      // Filter to only include ratings where both parties rated
      let visibleRatings = [];
      for (const ratingItem of allRatings) {
        const otherRating = await ctx.db.query.rating.findFirst({
          where: (ratings, { and, eq }) =>
            and(
              eq(ratings.reservationId, ratingItem.reservationId),
              eq(ratings.raterId, input.userId),
            ),
        });

        // Only show if both rated
        if (otherRating) {
          visibleRatings.push(ratingItem);
        }
      }

      // Filter by rating type if specified
      if (input.ratingType) {
        visibleRatings = visibleRatings.filter(
          (r: any) => r.ratingType === input.ratingType
        );
      }

      // Apply pagination
      const paginatedRatings = visibleRatings.slice(
        input.offset,
        input.offset + input.limit,
      );

      return {
        ratings: paginatedRatings.map((r: any) => ({
          id: r.id,
          score: r.score,
          comment: r.comment,
          createdAt: r.createdAt,
          ratingType: r.ratingType, // Include rating type
          listingTitle: r.reservation.listing.title,
        })),
        total: visibleRatings.length,
        hasMore: input.offset + input.limit < visibleRatings.length,
      };
    }),

  // Check if user can rate a reservation
  canRate: protectedProcedure
    .input(z.object({ reservationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const existingReservation = await ctx.db.query.reservation.findFirst({
        where: (reservations, { eq }) => eq(reservations.id, input.reservationId),
        with: {
          listing: true,
        },
      });

      if (!existingReservation) {
        return { canRate: false, reason: "Reservation not found" };
      }

      if (existingReservation.status !== "COMPLETED") {
        return { canRate: false, reason: "Reservation not completed yet" };
      }

      // Check if user is buyer or seller
      const isBuyer = existingReservation.buyerId === ctx.session.user.id;
      const isSeller =
        existingReservation.listing.sellerId === ctx.session.user.id;

      if (!isBuyer && !isSeller) {
        return { canRate: false, reason: "Not authorized" };
      }

      // Check if rating window is still open (7 days)
      const ratingDeadline = new Date(
        existingReservation.completedAt!.getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      if (new Date() > ratingDeadline) {
        return { canRate: false, reason: "Rating window expired" };
      }

      // Check if already rated
      const existingRating = await ctx.db.query.rating.findFirst({
        where: (ratings, { and, eq }) =>
          and(
            eq(ratings.reservationId, input.reservationId),
            eq(ratings.raterId, ctx.session.user.id),
          ),
      });

      // User can rate or update their existing rating
      return {
        canRate: true,
        reason: null,
        existingRating: existingRating ? {
          id: existingRating.id,
          score: existingRating.score,
          comment: existingRating.comment,
        } : null,
      };
    }),

  // Get public seller reviews (visible to anyone)
  getSellerReviews: publicProcedure
    .input(
      z.object({
        sellerId: z.string(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get ratings where this user was rated AS_SELLER (buyers reviewing the seller)
      const allRatings = await ctx.db.query.rating.findMany({
        where: (ratings, { and, eq }) =>
          and(
            eq(ratings.ratedId, input.sellerId),
            eq(ratings.ratingType, "AS_SELLER"),
          ),
        with: {
          rater: {
            columns: {
              id: true,
              name: true,
            },
          },
          reservation: {
            with: {
              listing: {
                columns: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: (ratings, { desc }) => [desc(ratings.createdAt)],
      });

      // Filter to only include ratings where both parties rated (blind reveal)
      const visibleRatings = [];
      for (const ratingItem of allRatings) {
        const otherRating = await ctx.db.query.rating.findFirst({
          where: (ratings, { and, eq }) =>
            and(
              eq(ratings.reservationId, ratingItem.reservationId),
              eq(ratings.raterId, input.sellerId),
            ),
        });

        // Only show if both rated
        if (otherRating) {
          visibleRatings.push(ratingItem);
        }
      }

      // Apply pagination
      const paginatedRatings = visibleRatings.slice(
        input.offset,
        input.offset + input.limit,
      );

      return {
        reviews: paginatedRatings.map((r: any) => ({
          id: r.id,
          score: r.score,
          comment: r.comment,
          createdAt: r.createdAt,
          buyerName: r.rater?.name ?? "Anonymous Buyer",
          listingTitle: r.reservation?.listing?.title,
        })),
        total: visibleRatings.length,
        hasMore: input.offset + input.limit < visibleRatings.length,
      };
    }),
});

// Helper function to recalculate user rating averages (both as buyer and seller)
async function updateUserRating(db: any, userId: string) {
  // Get all visible ratings for this user (where both parties rated)
  const allRatings = await db.query.rating.findMany({
    where: (ratings: any, { eq }: any) => eq(ratings.ratedId, userId),
  });

  // Filter to only ratings where both parties have rated
  const visibleRatings = [];
  for (const ratingItem of allRatings) {
    const otherRating = await db.query.rating.findFirst({
      where: (ratings: any, { and, eq }: any) =>
        and(
          eq(ratings.reservationId, ratingItem.reservationId),
          eq(ratings.raterId, userId),
        ),
    });

    if (otherRating) {
      visibleRatings.push(ratingItem);
    }
  }

  // Separate ratings by type
  const buyerRatings = visibleRatings.filter((r: any) => r.ratingType === "AS_BUYER");
  const sellerRatings = visibleRatings.filter((r: any) => r.ratingType === "AS_SELLER");

  // Calculate buyer ratings
  const buyerRatingCount = buyerRatings.length;
  const buyerRatingAverage =
    buyerRatingCount > 0
      ? buyerRatings.reduce((sum: number, r: any) => sum + r.score, 0) / buyerRatingCount
      : 0;

  // Calculate seller ratings
  const sellerRatingCount = sellerRatings.length;
  const sellerRatingAverage =
    sellerRatingCount > 0
      ? sellerRatings.reduce((sum: number, r: any) => sum + r.score, 0) / sellerRatingCount
      : 0;

  // Calculate overall ratings (for backward compatibility)
  const totalRatingCount = visibleRatings.length;
  const totalRatingAverage =
    totalRatingCount > 0
      ? visibleRatings.reduce((sum: number, r: any) => sum + r.score, 0) / totalRatingCount
      : 0;

  await db
    .update(user)
    .set({
      // Overall (backward compatibility)
      ratingAverage: Math.round(totalRatingAverage * 100) / 100,
      ratingCount: totalRatingCount,
      // Separate buyer/seller ratings
      buyerRatingAverage: Math.round(buyerRatingAverage * 100) / 100,
      buyerRatingCount,
      sellerRatingAverage: Math.round(sellerRatingAverage * 100) / 100,
      sellerRatingCount,
    })
    .where(eq(user.id, userId));
}
