// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// Load environment variables from .env.local first, then .env
// This ensures local development settings always take precedence
const rootDir = resolve(__dirname, "../../..");
const envLocalPath = resolve(rootDir, ".env.local");
const envPath = resolve(rootDir, ".env");

// Load .env first (base config)
if (existsSync(envPath)) {
  config({ path: envPath });
}

// Load .env.local second (overrides base config)
if (existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}

// NOW import the database dependencies after env is loaded
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import * as schemaExtensions from "./schema-extensions";

// Get database URL from environment
const connectionString = process.env.POSTGRES_URL!;

// Create postgres client optimized for serverless
const client = postgres(connectionString, {
  max: 1,              // Single connection per serverless instance
  prepare: false,      // Required for connection poolers (DO, Supabase, etc.)
  idle_timeout: 20,    // Close idle connections after 20 seconds
  connect_timeout: 10, // Fail fast if connection takes too long
});

export const db = drizzle(client, {
  schema: { ...schema, ...schemaExtensions },
  casing: "snake_case",
});
