import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";

import * as schema from "./schema";
import * as schemaExtensions from "./schema-extensions";

export const db = drizzle({
  client: sql,
  schema: { ...schema, ...schemaExtensions },
  casing: "snake_case",
});
