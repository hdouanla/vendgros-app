import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@acme/db/client";
import { eq } from "@acme/db";
import { listing, reservation } from "@acme/db/schema";
import { notifyReservationConfirmed } from "@acme/api/notifications";

// Initialize Stripe
function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-02-24.acacia",
  });
}

// Send payment confirmation notification
async function sendPaymentConfirmationNotification(params: {
  buyerEmail: string;
  buyerPhone?: string;
  sellerEmail: string;
  sellerPhone?: string;
  listingTitle: string;
  quantity: number;
  verificationCode: string;
  balanceDue: number;
  pickupAddress: string;
  pickupInstructions?: string;
}) {
  try {
    await notifyReservationConfirmed({
      buyerEmail: params.buyerEmail,
      buyerPhone: params.buyerPhone,
      sellerEmail: params.sellerEmail,
      sellerPhone: params.sellerPhone,
      listingTitle: params.listingTitle,
      quantity: params.quantity,
      verificationCode: params.verificationCode,
      balanceDue: params.balanceDue,
      pickupAddress: params.pickupAddress,
      pickupInstructions: params.pickupInstructions,
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
    // Don't throw - notification failure shouldn't fail the webhook
  }
}

// Handle payment_intent.succeeded event
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const reservationId = paymentIntent.metadata.reservationId;

  if (!reservationId) {
    console.log("No reservationId in payment intent metadata, skipping");
    return { processed: false, reason: "No reservation ID in metadata" };
  }

  // Fetch the reservation
  const existingReservation = await db.query.reservation.findFirst({
    where: (reservations, { eq }) => eq(reservations.id, reservationId),
    with: {
      listing: {
        with: {
          seller: true,
        },
      },
      buyer: true,
    },
  });

  if (!existingReservation) {
    console.log(`Reservation ${reservationId} not found`);
    return { processed: false, reason: "Reservation not found" };
  }

  // Idempotency check: if already confirmed, skip
  if (existingReservation.status === "CONFIRMED") {
    console.log(`Reservation ${reservationId} already confirmed, skipping`);
    return { processed: true, alreadyConfirmed: true };
  }

  // Only process PENDING reservations
  if (existingReservation.status !== "PENDING") {
    console.log(`Reservation ${reservationId} has status ${existingReservation.status}, skipping`);
    return { processed: false, reason: `Reservation status is ${existingReservation.status}` };
  }

  // Confirm reservation and decrement inventory in a transaction
  await db.transaction(async (tx) => {
    // Update reservation status
    await tx
      .update(reservation)
      .set({
        status: "CONFIRMED",
        stripePaymentIntentId: paymentIntent.id,
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

  console.log(`Reservation ${reservationId} confirmed via webhook`);

  // Send notifications (non-blocking)
  sendPaymentConfirmationNotification({
    buyerEmail: existingReservation.buyer.email,
    buyerPhone: existingReservation.buyer.phone ?? undefined,
    sellerEmail: existingReservation.listing.seller.email,
    sellerPhone: existingReservation.listing.seller.phone ?? undefined,
    listingTitle: existingReservation.listing.title,
    quantity: existingReservation.quantityReserved,
    verificationCode: existingReservation.verificationCode,
    balanceDue: existingReservation.totalPrice,
    pickupAddress: existingReservation.listing.pickupAddress,
    pickupInstructions: existingReservation.listing.pickupInstructions ?? undefined,
  }).catch((err) => console.error("Notification error:", err));

  return { processed: true, reservationId };
}

// Handle payment_intent.payment_failed event
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const reservationId = paymentIntent.metadata.reservationId;

  if (!reservationId) {
    return { processed: false, reason: "No reservation ID in metadata" };
  }

  // Log the failure for monitoring
  console.log(`Payment failed for reservation ${reservationId}`, {
    paymentIntentId: paymentIntent.id,
    lastPaymentError: paymentIntent.last_payment_error?.message,
  });

  // Note: We don't cancel the reservation here - the cron job will handle
  // expired PENDING reservations. This allows users to retry payment.

  return { processed: true, reservationId };
}

// Handle payment_intent.canceled event
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const reservationId = paymentIntent.metadata.reservationId;

  if (!reservationId) {
    return { processed: false, reason: "No reservation ID in metadata" };
  }

  const existingReservation = await db.query.reservation.findFirst({
    where: (reservations, { eq }) => eq(reservations.id, reservationId),
  });

  if (!existingReservation) {
    return { processed: false, reason: "Reservation not found" };
  }

  // Only cancel PENDING reservations
  if (existingReservation.status !== "PENDING") {
    return { processed: true, reason: "Reservation not in PENDING status" };
  }

  await db
    .update(reservation)
    .set({ status: "CANCELLED" })
    .where(eq(reservation.id, reservationId));

  console.log(`Reservation ${reservationId} cancelled via webhook`);

  return { processed: true, reservationId };
}

// Handle charge.refunded event
async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;

  if (!paymentIntentId) {
    return { processed: false, reason: "No payment intent ID in charge" };
  }

  // Find reservation by payment intent ID
  const existingReservation = await db.query.reservation.findFirst({
    where: (reservations, { eq }) => eq(reservations.stripePaymentIntentId, paymentIntentId),
  });

  if (!existingReservation) {
    console.log(`No reservation found for payment intent ${paymentIntentId}`);
    return { processed: false, reason: "Reservation not found" };
  }

  console.log(`Refund completed for reservation ${existingReservation.id}`, {
    chargeId: charge.id,
    amountRefunded: charge.amount_refunded / 100,
    currency: charge.currency,
  });

  // Note: We don't update status here as refundDeposit already handles that.
  // This webhook is mainly for logging/tracking refund completion.

  return { processed: true, reservationId: existingReservation.id };
}

// Handle charge.dispute.created event
async function handleChargeDisputeCreated(dispute: Stripe.Dispute) {
  const chargeId = typeof dispute.charge === "string"
    ? dispute.charge
    : dispute.charge?.id;

  console.error("DISPUTE CREATED - IMMEDIATE ATTENTION REQUIRED", {
    disputeId: dispute.id,
    chargeId,
    amount: dispute.amount / 100,
    reason: dispute.reason,
    status: dispute.status,
  });

  // In production, you would:
  // 1. Send alert to admin
  // 2. Potentially suspend the reservation/user
  // 3. Gather evidence for dispute response

  return { processed: true, disputeId: dispute.id };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  console.log(`Processing Stripe webhook: ${event.type}`, { eventId: event.id });

  try {
    let result;

    switch (event.type) {
      case "payment_intent.succeeded":
        result = await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        result = await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.canceled":
        result = await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.refunded":
        result = await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case "charge.dispute.created":
        result = await handleChargeDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
        result = { processed: false, reason: "Unhandled event type" };
    }

    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("Error processing webhook:", error);
    // Return 500 so Stripe will retry
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
