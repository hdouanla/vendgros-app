import { NextResponse } from "next/server";
import { db } from "@acme/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health check endpoint for monitoring and load balancers
 * Returns 200 OK if the application is healthy
 */
export async function GET() {
  try {
    // Check database connection
    await db.execute("SELECT 1");

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        version: process.env.npm_package_version || "1.0.0",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
