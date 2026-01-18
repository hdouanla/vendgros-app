import postgres from "postgres";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { sql as drizzleSql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../../../../.env.local") });

async function createSchema() {
  console.log("🔨 Creating database schema from Drizzle definitions...\n");

  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("❌ POSTGRES_URL environment variable not set");
    process.exit(1);
  }

  const connection = postgres(connectionString);
  const db = drizzle(connection, { schema });

  try {
    console.log("This will use drizzle-kit push...");
    console.log("Please run: pnpm push");
    console.log("And select 'create table' for all prompts");

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Schema creation failed:", error);
    await connection.end();
    process.exit(1);
  }
}

createSchema();
