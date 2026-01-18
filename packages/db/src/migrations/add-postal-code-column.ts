import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

async function addPostalCodeColumn() {
  console.log("Adding postalCode column to listing table...");

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    // Add postal code column
    await sql`
      ALTER TABLE listing
      ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
    `;
    console.log("✓ Added postal_code column");

    await sql`
      COMMENT ON COLUMN listing.postal_code IS 'Postal code for prefilling in edit mode';
    `;
    console.log("✓ Added column comment");

    console.log("\n✅ Migration completed successfully!");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    await sql.end();
    process.exit(1);
  }
}

addPostalCodeColumn();
