import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import * as schemaExtensions from "./schema-extensions";

// Get database URL from environment
const connectionString = process.env.POSTGRES_URL!;

// Detect if running in serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Create postgres client with serverless-optimized settings
const client = postgres(connectionString, {
  max: isServerless ? 1 : 10, // Single connection for serverless, pooled for local
  idle_timeout: isServerless ? 20 : 30, // Shorter timeout for serverless
  connect_timeout: 10, // 10 second connection timeout
  ssl: connectionString.includes("sslmode=require") ? "require" : undefined,
});

export const db = drizzle(client, {
  schema: { ...schema, ...schemaExtensions },
  casing: "snake_case",
});
