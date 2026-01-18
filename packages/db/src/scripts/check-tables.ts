import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

async function checkTables() {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const sql = postgres(connectionString);

  try {
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log("\n📋 Tables in database:");
    tables.forEach((t) => console.log(`  - ${t.tablename}`));
    console.log();

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Check failed:", error);
    await sql.end();
    process.exit(1);
  }
}

checkTables();
