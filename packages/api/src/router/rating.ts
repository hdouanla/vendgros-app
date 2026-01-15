import { z } from "zod/v4";
import { and, eq, sql } from "drizzle-orm";

import { rating, reservation, user } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

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

      if (existingRating) {
        throw new Error("You have already rated this transaction");
      }

      const rateeId = isBuyer
        ? existingReservation.listing.sellerId
        : existingReservation.buyerId;

      // Create rating
      const [newRating] = await ctx.db
        .insert(rating)
        .values({
          reservationId: input.reservationId,
          raterId: ctx.session.user.id,
          rateeId,
          score: input.score,
          comment: input.comment ?? null,
        })
        .returning();

      // Check if both parties have rated
      const otherRating = await ctx.db.query.rating.findFirst({
        where: (ratings, { and, eq }) =>
          and(
            eq(ratings.reservationId, input.reservationId),
            eq(ratings.raterId, rateeId),
          ),
      });

      // If both rated, update user rating averages
      if (otherRating) {
        await updateUserRating(ctx.db, rateeId);
        await updateUserRating(ctx.db, ctx.session.user.id);
      }

      return {
        success: true,
        ratingId: newRating.id,
        bothRated: !!otherRating,
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
        limit: z.number().default(20),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Only show ratings where both parties have rated
      const allRatings = await ctx.db.query.rating.findMany({
        where: (ratings, { eq }) => eq(ratings.rateeId, input.userId),
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
      const visibleRatings = [];
      for (const rating of allRatings) {
        const otherRating = await ctx.db.query.rating.findFirst({
          where: (ratings, { and, eq }) =>
            and(
              eq(ratings.reservationId, rating.reservationId),
              eq(ratings.raterId, input.userId),
            ),
        });

        // Only show if both rated
        if (otherRating) {
          visibleRatings.push(rating);
        }
      }

      // Apply pagination
      const paginatedRatings = visibleRatings.slice(
        input.offset,
        input.offset + input.limit,
      );

      return {
        ratings: paginatedRatings.map((r) => ({
          id: r.id,
          score: r.score,
          comment: r.comment,
          createdAt: r.createdAt,
          raterType: r.rater.userType,
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

      if (existingRating) {
        return { canRate: false, reason: "Already rated" };
      }

      return { canRate: true, reason: null };
    }),
});

// Helper function to recalculate user rating average
async function updateUserRating(db: any, userId: string) {
  // Get all visible ratings for this user (where both parties rated)
  const allRatings = await db.query.rating.findMany({
    where: (ratings: any, { eq }: any) => eq(ratings.rateeId, userId),
  });

  // Filter to only ratings where both parties have rated
  const visibleRatings = [];
  for (const rating of allRatings) {
    const otherRating = await db.query.rating.findFirst({
      where: (ratings: any, { and, eq }: any) =>
        and(
          eq(ratings.reservationId, rating.reservationId),
          eq(ratings.raterId, userId),
        ),
    });

    if (otherRating) {
      visibleRatings.push(rating);
    }
  }

  const ratingCount = visibleRatings.length;
  const ratingAverage =
    ratingCount > 0
      ? visibleRatings.reduce((sum, r) => sum + r.score, 0) / ratingCount
      : 0;

  await db
    .update(user)
    .set({
      ratingAverage: Math.round(ratingAverage * 100) / 100, // Round to 2 decimals
      ratingCount,
    })
    .where(eq(user.id, userId));
}
