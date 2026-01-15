import { createReadStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PostalCodeRow {
  postalcode: string;
  city: string;
  provincecode: string;
  latitude: string;
  longitude: string;
}

async function importPostalCodes() {
  console.log("Starting Canadian postal codes import...");

  // Use direct postgres connection for import
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL environment variable is required");
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema, casing: "snake_case" });

  const csvPath = resolve(
    __dirname,
    "../../../../data/canadian-postal-codes.csv",
  );
  const postalCodes: typeof schema.postalCode.$inferInsert[] = [];
  let count = 0;
  let skipped = 0;

  const parser = createReadStream(csvPath).pipe(
    parse({
      columns: true,
      delimiter: ";",
      skip_empty_lines: true,
    }),
  );

  for await (const row of parser as AsyncIterable<PostalCodeRow>) {
    // Postal codes already have spaces in the CSV
    const code = row.postalcode.toUpperCase().trim();

    // Validate Canadian postal code format (e.g., "M5H 2N2")
    if (!/^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(code)) {
      skipped++;
      continue;
    }

    postalCodes.push({
      code,
      city: row.city,
      province: row.provincecode.toUpperCase(),
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      location: null, // Will be set by trigger
    });

    count++;

    // Batch insert every 10000 records
    if (postalCodes.length >= 10000) {
      try {
        await db
          .insert(schema.postalCode)
          .values(postalCodes)
          .onConflictDoNothing();
        console.log(`✅ Imported ${count} postal codes (${skipped} skipped)...`);
        postalCodes.length = 0; // Clear array
      } catch (error) {
        console.error("Error inserting batch:", error);
        throw error;
      }
    }
  }

  // Insert remaining records
  if (postalCodes.length > 0) {
    await db
      .insert(schema.postalCode)
      .values(postalCodes)
      .onConflictDoNothing();
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`   Total imported: ${count} postal codes`);
  console.log(`   Skipped: ${skipped} invalid entries`);

  await client.end();
  process.exit(0);
}

importPostalCodes().catch((error) => {
  console.error("❌ Import failed:", error);
  process.exit(1);
});
