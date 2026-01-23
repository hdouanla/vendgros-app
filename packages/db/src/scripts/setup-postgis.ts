import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

async function setupPostGIS() {
  console.log("🗺️  Setting up PostGIS for Vendgros...\n");

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    // Read the SQL file
    const sqlFilePath = resolve(__dirname, "../../migrations/0001_initial_postgis_setup.sql");
    const sqlContent = readFileSync(sqlFilePath, "utf-8");

    console.log("📄 Running PostGIS setup SQL...\n");

    // Execute the SQL
    await sql.unsafe(sqlContent);

    console.log("\n✅ PostGIS setup completed successfully!");
    console.log("\nNext steps:");
    console.log("  1. Import postal codes: pnpm import-postal-codes");
    console.log("  2. Seed sample data: pnpm db:seed");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ PostGIS setup failed:", error);
    await sql.end();
    process.exit(1);
  }
}

setupPostGIS();
