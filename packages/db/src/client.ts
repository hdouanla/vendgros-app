import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import * as schemaExtensions from "./schema-extensions";

// Get database URL from environment
const connectionString = process.env.POSTGRES_URL!;

// Create postgres client
const client = postgres(connectionString, {
  max: 10, // Maximum number of connections in the pool
});

export const db = drizzle(client, {
  schema: { ...schema, ...schemaExtensions },
  casing: "snake_case",
});
