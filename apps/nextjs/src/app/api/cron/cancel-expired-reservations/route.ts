import { NextRequest, NextResponse } from "next/server";
import { db } from "@acme/db/client";
import { listing, reservation } from "@acme/db/schema";
import { and, eq, lt, or, isNull } from "@acme/db";

// Payment timeout in minutes (default 10)
const PAYMENT_TIMEOUT_MINUTES = Number(process.env.NEXT_PUBLIC_RESERVATION_PAYMENT_TIMEOUT_MINUTES) || 10;

// Verify the request is from Vercel Cron or has valid authorization
function verifyRequest(request: NextRequest): { valid: boolean; error?: string } {
  // Vercel Cron requests include this header
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (isVercelCron) {
    return { valid: true };
  }

  // Fallback to Bearer token authorization for manual triggers
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return { valid: false, error: "CRON_SECRET not configured" };
  }

  if (authHeader === `Bearer ${cronSecret}`) {
    return { valid: true };
  }

  return { valid: false, error: "Unauthorized" };
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
    // 2. Payment timeout reached (created more than X minutes ago and no payment)
    const expiredReservations = await db.query.reservation.findMany({
      where: and(
        eq(reservation.status, "PENDING"),
        or(
          // Pickup deadline expired
          lt(reservation.expiresAt, now),
          // Payment timeout: created before deadline AND no Stripe payment
          and(
            lt(reservation.createdAt, paymentDeadline),
            or(
              isNull(reservation.stripePaymentIntentId),
              eq(reservation.stripePaymentIntentId, "")
            )
          )
        )
      ),
      with: {
        listing: true,
      },
    });

    console.log(`Found ${expiredReservations.length} expired/unpaid reservations (payment timeout: ${PAYMENT_TIMEOUT_MINUTES}min)`);

    if (expiredReservations.length === 0) {
      return NextResponse.json({
        success: true,
        cancelled: 0,
        message: "No expired reservations found",
      });
    }

    // Cancel each expired reservation and return quantity to listing
    const results = await Promise.all(
      expiredReservations.map(async (res) => {
        try {
          // Determine reason for cancellation
          const isPaymentTimeout = res.createdAt < paymentDeadline &&
            (!res.stripePaymentIntentId || res.stripePaymentIntentId === "");
          const reason = isPaymentTimeout ? "payment_timeout" : "pickup_expired";

          await db.transaction(async (tx) => {
            // Update reservation status to CANCELLED
            await tx
              .update(reservation)
              .set({
                status: "CANCELLED",
                completedAt: new Date(),
              })
              .where(eq(reservation.id, res.id));

            // Return quantity to listing
            await tx
              .update(listing)
              .set({
                quantityAvailable:
                  res.listing.quantityAvailable + res.quantityReserved,
              })
              .where(eq(listing.id, res.listingId));
          });

          console.log(`Cancelled reservation ${res.id} (reason: ${reason})`);
          return { id: res.id, success: true, reason };
        } catch (error) {
          console.error(`Failed to cancel reservation ${res.id}:`, error);
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
