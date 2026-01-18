import { NextRequest, NextResponse } from "next/server";
import { db } from "@acme/db/client";
import { listing, reservation } from "@acme/db/schema";
import { and, eq, lt } from "drizzle-orm";

// This endpoint should be called by a cron service (e.g., Vercel Cron)
// POST /api/cron/cancel-expired-reservations
export async function POST(request: NextRequest) {
  try {
    // Verify authorization token to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("Unauthorized cron request");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find all PENDING reservations that have expired
    const now = new Date();

    const expiredReservations = await db.query.reservation.findMany({
      where: and(
        eq(reservation.status, "PENDING"),
        lt(reservation.expiresAt, now)
      ),
      with: {
        listing: true,
      },
    });

    console.log(`Found ${expiredReservations.length} expired reservations`);

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

          console.log(`Cancelled reservation ${res.id}`);
          return { id: res.id, success: true };
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

// Allow GET for health check
export async function GET() {
  return NextResponse.json({
    endpoint: "cancel-expired-reservations",
    status: "ready",
    message: "Use POST with authorization header to trigger cancellation",
  });
}
