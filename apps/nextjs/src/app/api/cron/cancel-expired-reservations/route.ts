import { NextRequest, NextResponse } from "next/server";
import { db } from "@acme/db/client";
import { reservation } from "@acme/db/schema";
import { and, eq, lt, or, isNull } from "@acme/db";

// Payment timeout in minutes (default 10)
const PAYMENT_TIMEOUT_MINUTES = Number(process.env.NEXT_PUBLIC_RESERVATION_PAYMENT_TIMEOUT_MINUTES) || 10;

// Verify the request is from Vercel Cron (Authorization: Bearer CRON_SECRET)
function verifyRequest(request: NextRequest): { valid: boolean; error?: string } {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Log for debugging (remove in production if needed)
  console.log("Cron auth check - has auth header:", !!authHeader, "has CRON_SECRET env:", !!cronSecret);

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set");
    return { valid: false, error: "CRON_SECRET not configured" };
  }

  if (!authHeader) {
    return { valid: false, error: "Missing authorization header" };
  }

  // Vercel sends: Authorization: Bearer {CRON_SECRET}
  if (authHeader === `Bearer ${cronSecret}`) {
    return { valid: true };
  }

  return { valid: false, error: "Invalid authorization" };
}

// Main handler for cancelling expired reservations
async function handleCancelExpiredReservations(request: NextRequest) {
  const verification = verifyRequest(request);
  if (!verification.valid) {
    console.error("Unauthorized cron request:", verification.error);
    return NextResponse.json(
      { error: verification.error },
      { status: verification.error === "CRON_SECRET not configured" ? 500 : 401 }
    );
  }

  try {
    const now = new Date();
    const paymentDeadline = new Date(now.getTime() - PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

    // Find all PENDING reservations that have either:
    // 1. Expired (pickup deadline passed)
    // 2. Payment timeout reached (created more than X minutes ago)
    // Note: Having a stripePaymentIntentId doesn't mean payment succeeded -
    // if status is still PENDING after timeout, payment was never completed
    const expiredReservations = await db.query.reservation.findMany({
      where: and(
        eq(reservation.status, "PENDING"),
        or(
          // Pickup deadline expired
          lt(reservation.expiresAt, now),
          // Payment timeout: created before deadline (regardless of payment intent)
          lt(reservation.createdAt, paymentDeadline)
        )
      ),
    });

    console.log(`Found ${expiredReservations.length} expired/unpaid reservations (payment timeout: ${PAYMENT_TIMEOUT_MINUTES}min)`);

    if (expiredReservations.length === 0) {
      return NextResponse.json({
        success: true,
        cancelled: 0,
        message: "No expired reservations found",
      });
    }

    // Delete each expired PENDING reservation
    // Note: PENDING reservations never decremented quantityAvailable (that only happens on payment),
    // so we simply delete them rather than trying to "return" inventory
    const results = await Promise.all(
      expiredReservations.map(async (res) => {
        try {
          // Determine reason for deletion (for logging)
          const isPaymentTimeout = res.createdAt < paymentDeadline &&
            (!res.stripePaymentIntentId || res.stripePaymentIntentId === "");
          const reason = isPaymentTimeout ? "payment_timeout" : "pickup_expired";

          // Simply delete the expired PENDING reservation
          await db
            .delete(reservation)
            .where(eq(reservation.id, res.id));

          console.log(`Deleted expired reservation ${res.id} (reason: ${reason})`);
          return { id: res.id, success: true, reason };
        } catch (error) {
          console.error(`Failed to delete reservation ${res.id}:`, error);
          return { id: res.id, success: false, error };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    console.log(`Successfully cancelled ${successCount} reservations, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      cancelled: successCount,
      failed: failedCount,
      message: `Cancelled ${successCount} expired reservations`,
      details: results,
    });
  } catch (error) {
    console.error("Error in cancel-expired-reservations cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Vercel Cron uses GET requests
export async function GET(request: NextRequest) {
  return handleCancelExpiredReservations(request);
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return handleCancelExpiredReservations(request);
}
