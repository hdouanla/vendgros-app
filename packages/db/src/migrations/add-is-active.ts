import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

async function addIsActiveField() {
  console.log("Starting migration: Add isActive field to listing table...");

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    // Add the isActive column
    await sql`
      ALTER TABLE listing
      ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
    `;
    console.log("✓ Added isActive column");

    // Add comment
    await sql`
      COMMENT ON COLUMN listing."isActive" IS 'Allows seller to temporarily deactivate listing without changing status';
    `;
    console.log("✓ Added column comment");

    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_listing_is_active ON listing("isActive");
    `;
    console.log("✓ Created index");

    // Update existing PUBLISHED listings to be active
    const result = await sql`
      UPDATE listing SET "isActive" = true WHERE status = 'PUBLISHED';
    `;
    console.log(`✓ Updated ${result.count} existing listings`);

    console.log("\n✅ Migration completed successfully!");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await sql.end();
    process.exit(1);
  }
}

addIsActiveField();
