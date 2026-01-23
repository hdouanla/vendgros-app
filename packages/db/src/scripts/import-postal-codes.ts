import { createReadStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse";
import postgres from "postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ZipCodeSoft CSV format
interface PostalCodeRow {
  countrycode: string;
  postalcode: string;
  city: string;
  province: string;
  provincecode: string;
  timezone: string;
  daylightsaving: string;
  latitude: string;
  longitude: string;
}

interface PostalCodeInsert {
  code: string;
  country_code: string;
  city: string;
  province_name: string;
  province: string;
  timezone: string;
  daylight_saving: boolean;
  latitude: number;
  longitude: number;
}

async function importPostalCodes() {
  console.log("Starting Canadian postal codes import...");

  // Use direct postgres connection for import
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL environment variable is required");
  }

  const sql = postgres(connectionString);

  const csvPath = resolve(
    __dirname,
    "../../../../data/canadian-postal-codes.csv",
  );
  const postalCodesMap = new Map<string, PostalCodeInsert>(); // Use Map to dedupe by code
  let count = 0;
  let skipped = 0;
  let duplicates = 0;

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

    // Use Map to dedupe - later entries override earlier ones
    if (postalCodesMap.has(code)) {
      duplicates++;
    }
    postalCodesMap.set(code, {
      code,
      country_code: row.countrycode.toUpperCase(),
      city: row.city,
      province_name: row.province,
      province: row.provincecode.toUpperCase(),
      timezone: row.timezone, // e.g., "GMT -05:00"
      daylight_saving: row.daylightsaving.toUpperCase() === "Y",
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
    });

    count++;

    // Batch upsert every 1000 records (9 cols * 1000 = 9000 params, well under 65534 limit)
    if (postalCodesMap.size >= 1000) {
      try {
        const batch = Array.from(postalCodesMap.values());
        await sql`
          INSERT INTO postal_code ${sql(batch, "code", "country_code", "city", "province_name", "province", "timezone", "daylight_saving", "latitude", "longitude")}
          ON CONFLICT (code) DO UPDATE SET
            country_code = EXCLUDED.country_code,
            city = EXCLUDED.city,
            province_name = EXCLUDED.province_name,
            province = EXCLUDED.province,
            timezone = EXCLUDED.timezone,
            daylight_saving = EXCLUDED.daylight_saving,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude
        `;
        console.log(`✅ Imported ${count} postal codes (${skipped} skipped, ${duplicates} deduped)...`);
        postalCodesMap.clear();
      } catch (error) {
        console.error("Error inserting batch:", error);
        throw error;
      }
    }
  }

  // Upsert remaining records
  if (postalCodesMap.size > 0) {
    const batch = Array.from(postalCodesMap.values());
    await sql`
      INSERT INTO postal_code ${sql(batch, "code", "country_code", "city", "province_name", "province", "timezone", "daylight_saving", "latitude", "longitude")}
      ON CONFLICT (code) DO UPDATE SET
        country_code = EXCLUDED.country_code,
        city = EXCLUDED.city,
        province_name = EXCLUDED.province_name,
        province = EXCLUDED.province,
        timezone = EXCLUDED.timezone,
        daylight_saving = EXCLUDED.daylight_saving,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude
    `;
  }

  console.log(`\n🎉 Import complete!`);
  console.log(`   Total imported: ${count} postal codes`);
  console.log(`   Skipped: ${skipped} invalid entries`);

  await sql.end();
  process.exit(0);
}

importPostalCodes().catch((error) => {
  console.error("❌ Import failed:", error);
  process.exit(1);
});
