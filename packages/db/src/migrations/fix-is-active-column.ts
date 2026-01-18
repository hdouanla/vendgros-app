import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

async function fixIsActiveColumn() {
  console.log("Fixing isActive column name...");

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    // Rename the column from isActive to is_active
    await sql`
      ALTER TABLE listing RENAME COLUMN "isActive" TO "is_active";
    `;
    console.log("✓ Renamed column from isActive to is_active");

    console.log("\n✅ Fix completed successfully!");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Fix failed:", error);
    await sql.end();
    process.exit(1);
  }
}

fixIsActiveColumn();
