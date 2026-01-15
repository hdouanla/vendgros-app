/**
 * Database Maintenance CLI
 *
 * Utility script for common database maintenance tasks in production.
 *
 * Usage:
 *   pnpm db:maintenance <command> [options]
 *
 * Commands:
 *   vacuum          - Reclaim storage and update statistics
 *   reindex         - Rebuild all indexes
 *   analyze         - Update query planner statistics
 *   cleanup-expired - Remove expired reservations
 *   cleanup-old     - Remove old completed reservations
 *   health          - Run database health checks
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, lt } from "drizzle-orm";
import * as schema from "../schema";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("❌ POSTGRES_URL environment variable is required");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema, casing: "snake_case" });

// ============================================================================
// Maintenance Tasks
// ============================================================================

async function vacuumDatabase() {
  console.log("🧹 Running VACUUM ANALYZE on all tables...");

  const tables = [
    "User",
    "Listing",
    "Reservation",
    "Rating",
    "Message",
    "Notification",
    "Payment",
    "WebhookDelivery",
  ];

  for (const table of tables) {
    try {
      console.log(`   Vacuuming ${table}...`);
      await client.unsafe(`VACUUM ANALYZE "${table}"`);
      console.log(`   ✅ ${table} complete`);
    } catch (error) {
      console.error(`   ❌ Error vacuuming ${table}:`, error);
    }
  }

  console.log("✅ VACUUM complete");
}

async function reindexDatabase() {
  console.log("🔨 Rebuilding indexes...");

  const tables = [
    "User",
    "Listing",
    "Reservation",
    "Rating",
    "Message",
    "Notification",
  ];

  for (const table of tables) {
    try {
      console.log(`   Reindexing ${table}...`);
      await client.unsafe(`REINDEX TABLE "${table}"`);
      console.log(`   ✅ ${table} complete`);
    } catch (error) {
      console.error(`   ❌ Error reindexing ${table}:`, error);
    }
  }

  console.log("✅ REINDEX complete");
}

async function analyzeDatabase() {
  console.log("📊 Updating query planner statistics...");

  try {
    await client.unsafe("ANALYZE");
    console.log("✅ ANALYZE complete");
  } catch (error) {
    console.error("❌ Error running ANALYZE:", error);
  }
}

async function cleanupExpiredReservations() {
  console.log("🧹 Cleaning up expired reservations...");

  try {
    const now = new Date();

    // Find expired reservations that are still PENDING
    const expiredReservations = await db.query.reservation.findMany({
      where: and(
        eq(schema.reservation.status, "PENDING"),
        lt(schema.reservation.expiresAt, now),
      ),
    });

    console.log(`   Found ${expiredReservations.length} expired reservations`);

    // Update status to CANCELLED and restore inventory
    for (const reservation of expiredReservations) {
      await db.transaction(async (tx) => {
        // Update reservation status
        await tx
          .update(schema.reservation)
          .set({ status: "CANCELLED" })
          .where(eq(schema.reservation.id, reservation.id));

        // Restore inventory (use sql operator for increment)
        const listing = await tx.query.listing.findFirst({
          where: eq(schema.listing.id, reservation.listingId),
        });
        if (listing) {
          await tx
            .update(schema.listing)
            .set({
              quantityAvailable: listing.quantityAvailable + reservation.quantityReserved,
            })
            .where(eq(schema.listing.id, reservation.listingId));
        }
      });
    }

    console.log(`✅ Cleaned up ${expiredReservations.length} expired reservations`);
  } catch (error) {
    console.error("❌ Error cleaning up expired reservations:", error);
  }
}

async function cleanupOldReservations() {
  console.log("🧹 Cleaning up old completed/cancelled reservations...");

  try {
    // Delete completed/cancelled reservations older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deleted = await db
      .delete(schema.reservation)
      .where(
        and(
          eq(schema.reservation.status, "COMPLETED"),
          lt(schema.reservation.updatedAt, ninetyDaysAgo),
        ),
      )
      .returning();

    console.log(`✅ Deleted ${deleted.length} old completed reservations`);
  } catch (error) {
    console.error("❌ Error cleaning up old reservations:", error);
  }
}

async function checkDatabaseHealth() {
  console.log("🏥 Running database health checks...\n");

  try {
    // 1. Check database size
    const dbSizeResult = await client.unsafe<Array<{ size: string }>>(
      "SELECT pg_size_pretty(pg_database_size(current_database())) as size",
    );
    console.log(`📦 Database size: ${dbSizeResult[0]?.size}`);

    // 2. Check table sizes
    const tableSizeResult = await client.unsafe<
      Array<{ table_name: string; size: string; row_count: string }>
    >(`
      SELECT
        schemaname || '.' || tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
        n_live_tup::text as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
      LIMIT 10
    `);
    console.log("\n📊 Top 10 tables by size:");
    tableSizeResult.forEach((row) => {
      console.log(
        `   ${row.table_name.padEnd(30)} ${row.size.padEnd(10)} (${row.row_count} rows)`,
      );
    });

    // 3. Check index usage
    const indexUsageResult = await client.unsafe<
      Array<{ table_name: string; index_name: string; scans: number }>
    >(`
      SELECT
        schemaname || '.' || tablename as table_name,
        indexname as index_name,
        idx_scan as scans
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan ASC
      LIMIT 10
    `);
    console.log("\n🔍 Least used indexes (consider removing if scans = 0):");
    indexUsageResult.forEach((row) => {
      console.log(
        `   ${row.index_name.padEnd(40)} ${row.scans} scans`,
      );
    });

    // 4. Check for bloat
    const bloatResult = await client.unsafe<
      Array<{ table_name: string; bloat_pct: number }>
    >(`
      SELECT
        tablename as table_name,
        ROUND(100 * (pg_relation_size(schemaname || '.' || tablename) -
              (n_live_tup * (SELECT current_setting('block_size')::int / 8))::bigint) /
              NULLIF(pg_relation_size(schemaname || '.' || tablename), 0)::numeric, 2) as bloat_pct
      FROM pg_stat_user_tables
      WHERE schemaname = 'public' AND n_live_tup > 0
      ORDER BY bloat_pct DESC
      LIMIT 5
    `);
    console.log("\n💨 Tables with potential bloat (run VACUUM if > 20%):");
    bloatResult.forEach((row) => {
      const bloatPct = row.bloat_pct || 0;
      const status = bloatPct > 20 ? "⚠️" : "✅";
      console.log(
        `   ${status} ${row.table_name.padEnd(30)} ${bloatPct.toFixed(1)}% bloat`,
      );
    });

    // 5. Check connection count
    const connectionResult = await client.unsafe<
      Array<{ total: number; active: number; idle: number }>
    >(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN state = 'idle' THEN 1 ELSE 0 END) as idle
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);
    console.log("\n🔌 Database connections:");
    console.log(
      `   Total: ${connectionResult[0]?.total}, Active: ${connectionResult[0]?.active}, Idle: ${connectionResult[0]?.idle}`,
    );

    // 6. Check long-running queries
    const longQueriesResult = await client.unsafe<
      Array<{ duration: string; query: string }>
    >(`
      SELECT
        now() - query_start as duration,
        query
      FROM pg_stat_activity
      WHERE state = 'active' AND query NOT ILIKE '%pg_stat_activity%'
      ORDER BY query_start
      LIMIT 5
    `);
    if (longQueriesResult.length > 0) {
      console.log("\n⏱️  Active queries:");
      longQueriesResult.forEach((row) => {
        console.log(`   ${row.duration} - ${row.query.substring(0, 80)}...`);
      });
    }

    console.log("\n✅ Health check complete");
  } catch (error) {
    console.error("❌ Error running health checks:", error);
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log(`
Database Maintenance CLI

Usage: pnpm db:maintenance <command>

Commands:
  vacuum          - Reclaim storage and update statistics (weekly)
  reindex         - Rebuild all indexes (monthly)
  analyze         - Update query planner statistics (daily)
  cleanup-expired - Remove expired reservations (daily)
  cleanup-old     - Remove old completed reservations (quarterly)
  health          - Run database health checks

Examples:
  pnpm db:maintenance vacuum
  pnpm db:maintenance health
  pnpm db:maintenance cleanup-expired
`);
    process.exit(0);
  }

  console.log(`\n🚀 Vendgros Database Maintenance\n`);
  console.log(`Command: ${command}\n`);

  switch (command) {
    case "vacuum":
      await vacuumDatabase();
      break;

    case "reindex":
      await reindexDatabase();
      break;

    case "analyze":
      await analyzeDatabase();
      break;

    case "cleanup-expired":
      await cleanupExpiredReservations();
      break;

    case "cleanup-old":
      await cleanupOldReservations();
      break;

    case "health":
      await checkDatabaseHealth();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "pnpm db:maintenance" for usage information');
      process.exit(1);
  }

  await client.end();
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
