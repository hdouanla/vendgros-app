import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

async function resetDatabase() {
  console.log("🔄 Resetting database for fresh development...\n");

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    // Drop all application tables in correct order (respecting foreign keys)
    console.log("Dropping existing tables...");

    await sql`DROP TABLE IF EXISTS message CASCADE;`;
    console.log("✓ Dropped message");

    await sql`DROP TABLE IF EXISTS conversation CASCADE;`;
    console.log("✓ Dropped conversation");

    await sql`DROP TABLE IF EXISTS rating CASCADE;`;
    console.log("✓ Dropped rating");

    await sql`DROP TABLE IF EXISTS reservation CASCADE;`;
    console.log("✓ Dropped reservation");

    await sql`DROP TABLE IF EXISTS listing CASCADE;`;
    console.log("✓ Dropped listing");

    await sql`DROP TABLE IF EXISTS bulk_import CASCADE;`;
    console.log("✓ Dropped bulk_import");

    await sql`DROP TABLE IF EXISTS "user" CASCADE;`;
    console.log("✓ Dropped user");

    await sql`DROP TABLE IF EXISTS account CASCADE;`;
    console.log("✓ Dropped account");

    await sql`DROP TABLE IF EXISTS session CASCADE;`;
    console.log("✓ Dropped session");

    await sql`DROP TABLE IF EXISTS verification CASCADE;`;
    console.log("✓ Dropped verification");

    await sql`DROP TABLE IF EXISTS verification_token CASCADE;`;
    console.log("✓ Dropped verification_token (legacy)");

    await sql`DROP TABLE IF EXISTS postal_code CASCADE;`;
    console.log("✓ Dropped postal_code");

    // Drop enums
    await sql`DROP TYPE IF EXISTS user_type CASCADE;`;
    await sql`DROP TYPE IF EXISTS account_status CASCADE;`;
    await sql`DROP TYPE IF EXISTS listing_status CASCADE;`;
    await sql`DROP TYPE IF EXISTS reservation_status CASCADE;`;
    await sql`DROP TYPE IF EXISTS bulk_import_status CASCADE;`;
    await sql`DROP TYPE IF EXISTS verification_badge CASCADE;`;
    console.log("✓ Dropped enums");

    console.log("\n✅ Database reset complete!");
    console.log("\nNext steps:");
    console.log("Run: pnpm db:init (from packages/db)");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Reset failed:", error);
    await sql.end();
    process.exit(1);
  }
}

resetDatabase();
