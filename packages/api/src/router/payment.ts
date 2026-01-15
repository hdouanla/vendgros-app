import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { listing, reservation } from "@acme/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";

// Initialize Stripe (API key should be in environment variables)
function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-02-24.acacia",
  });
}

export const paymentRouter = createTRPCRouter({
  // Create payment intent for 5% deposit
  createDepositPayment: protectedProcedure
    .input(z.object({ reservationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existingReservation = await ctx.db.query.reservation.findFirst({
        where: (reservations, { eq }) => eq(reservations.id, input.reservationId),
        with: {
          listing: {
            with: {
              seller: {
                columns: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!existingReservation) {
        throw new Error("Reservation not found");
      }

      if (existingReservation.buyerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      if (existingReservation.status !== "PENDING") {
        throw new Error("Reservation already processed");
      }

      // Create Stripe Payment Intent
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(existingReservation.depositAmount * 100), // Convert to cents
        currency: "cad",
        metadata: {
          reservationId: existingReservation.id,
          listingId: existingReservation.listingId,
          buyerId: existingReservation.buyerId,
          sellerId: existingReservation.listing.sellerId,
        },
        description: `Vendgros deposit for: ${existingReservation.listing.title}`,
        receipt_email: ctx.session.user.email || undefined,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Update reservation with payment intent ID
      await ctx.db
        .update(reservation)
        .set({ stripePaymentIntentId: paymentIntent.id })
        .where(eq(reservation.id, input.reservationId));

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        depositAmount: existingReservation.depositAmount,
      };
    }),

  // Verify payment success (called after Stripe confirms payment)
  verifyPayment: protectedProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(
        input.paymentIntentId,
      );

      if (paymentIntent.status !== "succeeded") {
        throw new Error("Payment not completed");
      }

      const reservationId = paymentIntent.metadata.reservationId;
      if (!reservationId) {
        throw new Error("Invalid payment intent metadata");
      }

      const existingReservation = await ctx.db.query.reservation.findFirst({
        where: (reservations, { eq }) => eq(reservations.id, reservationId),
        with: {
          listing: true,
        },
      });

      if (!existingReservation) {
        throw new Error("Reservation not found");
      }

      if (existingReservation.buyerId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      if (existingReservation.status === "CONFIRMED") {
        // Already confirmed, return success
        return { success: true, alreadyConfirmed: true };
      }

      // Confirm reservation and decrement inventory
      await ctx.db.transaction(async (tx) => {
        // Update reservation status
        await tx
          .update(reservation)
          .set({
            status: "CONFIRMED",
            stripePaymentIntentId: input.paymentIntentId,
          })
          .where(eq(reservation.id, reservationId));

        // Decrement listing inventory
        await tx
          .update(listing)
          .set({
            quantityAvailable:
              existingReservation.listing.quantityAvailable -
              existingReservation.quantityReserved,
          })
          .where(eq(listing.id, existingReservation.listingId));
      });

      // TODO: Send confirmation notification to buyer and seller

      return { success: true, alreadyConfirmed: false };
    }),

  // Handle webhook events from Stripe
  // Note: This should be called from a dedicated webhook endpoint, not tRPC
  // This is a helper for processing webhook events
  processWebhookEvent: protectedProcedure
    .input(
      z.object({
        eventType: z.string(),
        paymentIntentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins can process webhook events
      const currentUser = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id),
      });

      if (currentUser?.userType !== "ADMIN") {
        throw new Error("Admin access required");
      }

      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(
        input.paymentIntentId,
      );

      const reservationId = paymentIntent.metadata.reservationId;
      if (!reservationId) {
        return { processed: false, reason: "No reservation ID in metadata" };
      }

      switch (input.eventType) {
        case "payment_intent.succeeded":
          // Payment confirmed - update reservation
          await ctx.db.transaction(async (tx) => {
            const existingReservation = await tx.query.reservation.findFirst({
              where: (reservations, { eq }) =>
                eq(reservations.id, reservationId),
              with: { listing: true },
            });

            if (!existingReservation) {
              throw new Error("Reservation not found");
            }

            await tx
              .update(reservation)
              .set({
                status: "CONFIRMED",
                stripePaymentIntentId: input.paymentIntentId,
              })
              .where(eq(reservation.id, reservationId));

            await tx
              .update(listing)
              .set({
                quantityAvailable:
                  existingReservation.listing.quantityAvailable -
                  existingReservation.quantityReserved,
              })
              .where(eq(listing.id, existingReservation.listingId));
          });
          return { processed: true };

        case "payment_intent.payment_failed":
          // Payment failed - could implement retry logic or notification
          // For now, just log it
          return { processed: true };

        case "payment_intent.canceled":
          // Payment canceled by user
          await ctx.db
            .update(reservation)
            .set({ status: "CANCELLED" })
            .where(eq(reservation.id, reservationId));
          return { processed: true };

        default:
          return { processed: false, reason: "Unhandled event type" };
      }
    }),

  // Get payment status for a reservation
  getPaymentStatus: protectedProcedure
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

      if (!existingReservation.stripePaymentIntentId) {
        return {
          status: "no_payment",
          depositPaid: false,
        };
      }

      // Retrieve payment intent from Stripe
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(
        existingReservation.stripePaymentIntentId,
      );

      return {
        status: paymentIntent.status,
        depositPaid: paymentIntent.status === "succeeded",
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
      };
    }),

  // Create refund for canceled reservation (admin only)
  refundDeposit: protectedProcedure
    .input(
      z.object({
        reservationId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check admin access
      const currentUser = await ctx.db.query.user.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id),
      });

      if (currentUser?.userType !== "ADMIN") {
        throw new Error("Admin access required");
      }

      const existingReservation = await ctx.db.query.reservation.findFirst({
        where: (reservations, { eq }) => eq(reservations.id, input.reservationId),
        with: {
          listing: true,
        },
      });

      if (!existingReservation) {
        throw new Error("Reservation not found");
      }

      if (!existingReservation.stripePaymentIntentId) {
        throw new Error("No payment to refund");
      }

      const stripe = getStripe();

      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: existingReservation.stripePaymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          reservationId: existingReservation.id,
          adminReason: input.reason ?? "Admin refund",
        },
      });

      // Update reservation status
      await ctx.db
        .update(reservation)
        .set({ status: "CANCELLED" })
        .where(eq(reservation.id, input.reservationId));

      // Restore listing inventory
      await ctx.db
        .update(listing)
        .set({
          quantityAvailable:
            existingReservation.listing.quantityAvailable +
            existingReservation.quantityReserved,
        })
        .where(eq(listing.id, existingReservation.listingId));

      // TODO: Send refund notification to buyer

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
      };
    }),
});
