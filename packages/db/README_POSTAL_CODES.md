# Canadian Postal Codes Setup

This guide explains how to import Canadian postal codes into the database for proximity-based searches.

## Overview

The postal code system enables:
- ✅ Search listings by postal code + radius
- ✅ Auto-complete postal code lookups
- ✅ Distance calculations from postal code to listing
- ✅ City/province detection from postal code
- ✅ Fast geospatial queries using PostGIS

## Prerequisites

1. **PostgreSQL with PostGIS** extension enabled
2. **Canadian postal code data** in CSV format
3. **Database migrations** applied

## Step 1: Apply Database Migration

Run the spatial setup migration:

```bash
# From packages/db directory
psql $POSTGRES_URL -f migrations/postal_code_spatial_setup.sql
```

This creates:
- ✅ Trigger to auto-populate PostGIS POINT geometry
- ✅ GiST spatial index for fast proximity queries
- ✅ Helper functions for searching
- ✅ Indexes on province and city

## Step 2: Obtain Postal Code Data

### Option A: Download from Statistics Canada (Free, Official)

Statistics Canada provides official postal code data:

1. Visit: https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm
2. Download: **Postal Code Conversion File (PCCF)**
3. Extract and convert to CSV with columns:
   - `postalcode` (e.g., "M5H 2N2")
   - `city`
   - `provincecode` (e.g., "ON")
   - `latitude`
   - `longitude`

### Option B: Use GeoNames (Free, Less Complete)

GeoNames provides Canadian postal codes:

1. Visit: http://download.geonames.org/export/zip/
2. Download: `CA.zip`
3. Extract `CA.txt` and convert to CSV format
4. Rename columns to match required format (see above)

### Option C: Purchase from ZipCodeSoft (Commercial, Most Complete)

For the most comprehensive and up-to-date data:

1. Visit: https://www.zipcodesoft.com/products/canada/canada-zip-code-database.aspx
2. Purchase: **Canadian Postal Code Database**
3. Download CSV with required columns
4. Place at: `data/canadian-postal-codes.csv`

### Option D: Use Sample Data (Testing Only)

For development/testing, we provide a sample file:

```bash
# From project root
cp packages/db/sample-postal-codes.csv data/canadian-postal-codes.csv
```

**⚠️ Warning:** Sample data only includes ~100 codes from major cities.

## Step 3: Prepare Data File

The CSV must have these columns (semicolon-delimited):

```csv
postalcode;city;provincecode;latitude;longitude
M5H 2N2;Toronto;ON;43.6532;-79.3832
V6B 1A7;Vancouver;BC;49.2827;-123.1207
H2Y 1C6;Montreal;QC;45.5017;-73.5673
```

Required format:
- **Delimiter:** Semicolon (`;`)
- **Headers:** `postalcode;city;provincecode;latitude;longitude`
- **Postal Code:** Format with space (e.g., "M5H 2N2")
- **Province:** 2-letter code (ON, QC, BC, etc.)
- **Coordinates:** Decimal degrees (WGS84)

Place the file at: `data/canadian-postal-codes.csv` (relative to project root)

## Step 4: Import Postal Codes

From the project root:

```bash
# Ensure .env has POSTGRES_URL configured
pnpm db:import-postal-codes
```

The import script will:
1. ✅ Read CSV data in batches of 10,000
2. ✅ Validate postal code format (Canadian A1A 1A1)
3. ✅ Insert with conflict handling (re-runnable)
4. ✅ Auto-populate PostGIS POINT geometry via trigger
5. ✅ Show progress and statistics

Expected output:
```
Starting Canadian postal codes import...
✅ Imported 10000 postal codes (0 skipped)...
✅ Imported 20000 postal codes (0 skipped)...
...
🎉 Import complete!
   Total imported: 876,445 postal codes
   Skipped: 124 invalid entries
```

## Step 5: Verify Import

```sql
-- Count imported codes
SELECT COUNT(*) FROM postal_code;

-- Sample data
SELECT * FROM postal_code LIMIT 10;

-- Test proximity search (10km around Toronto downtown)
SELECT * FROM find_postal_codes_near_point(43.6532, -79.3832, 10);

-- Test listing search by postal code (25km radius)
SELECT * FROM find_listings_near_postal_code('M5H 2N2', 25);
```

## Database Schema

```sql
CREATE TABLE postal_code (
  code VARCHAR(7) PRIMARY KEY,     -- e.g., "M5H 2N2"
  city VARCHAR(100) NOT NULL,      -- "Toronto"
  province VARCHAR(2) NOT NULL,    -- "ON"
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location TEXT                    -- PostGIS POINT geometry
);

-- Indexes
CREATE INDEX postal_code_coords_idx ON postal_code(latitude, longitude);
CREATE INDEX postal_code_location_gist_idx ON postal_code USING GIST (ST_GeomFromText(location, 4326));
CREATE INDEX postal_code_province_idx ON postal_code(province);
CREATE INDEX postal_code_city_idx ON postal_code(city);
```

## Usage in Application

### tRPC Endpoint Example

```typescript
// Search listings by postal code
searchByPostalCode: publicProcedure
  .input(
    z.object({
      postalCode: z.string().regex(/^[A-Z]\d[A-Z] \d[A-Z]\d$/),
      radius: z.number().min(1).max(100).default(25), // km
    })
  )
  .query(async ({ ctx, input }) => {
    const results = await ctx.db.execute(sql`
      SELECT * FROM find_listings_near_postal_code(
        ${input.postalCode},
        ${input.radius}
      )
    `);
    return results;
  });
```

### Direct SQL Query

```typescript
// Get postal code details
const postalCode = await db.query.postalCode.findFirst({
  where: eq(schema.postalCode.code, "M5H 2N2"),
});

// Find nearby postal codes using raw SQL
const nearby = await db.execute(sql`
  SELECT * FROM find_postal_codes_near_point(
    ${latitude},
    ${longitude},
    ${radiusKm}
  )
`);
```

## Performance

With 876,445 Canadian postal codes:
- **Storage:** ~100 MB
- **Import Time:** 2-3 minutes
- **Proximity Query:** < 50ms (with spatial index)
- **Exact Lookup:** < 1ms (primary key)

## Updating Data

The import script is idempotent (can be re-run):

```bash
# Re-import to update data
pnpm db:import-postal-codes
```

Uses `ON CONFLICT DO NOTHING` to avoid duplicates.

## Troubleshooting

### Error: "CSV file not found"
- Ensure file exists at: `data/canadian-postal-codes.csv`
- Check path from project root

### Error: "POSTGRES_URL not set"
- Configure `.env` with database connection string
- Example: `POSTGRES_URL="postgresql://user:pass@localhost:5432/vendgros"`

### Error: "PostGIS extension not found"
- Run migrations first: `pnpm db:push`
- Or manually: `CREATE EXTENSION IF NOT EXISTS postgis;`

### Slow Import
- Normal for 876k+ records (2-3 minutes)
- Batch size: 10,000 (configurable in script)
- Indexes created after import for speed

### Invalid Postal Codes Skipped
- Only Canadian format accepted: `A1A 1A1`
- Check CSV format (semicolon-delimited)
- Verify headers match required columns

## Data Sources Comparison

| Source | Cost | Coverage | Update Frequency | Accuracy |
|--------|------|----------|-----------------|----------|
| Statistics Canada | Free | 100% | Quarterly | ⭐⭐⭐⭐⭐ |
| GeoNames | Free | ~90% | Monthly | ⭐⭐⭐⭐ |
| ZipCodeSoft | $$ | 100% | Monthly | ⭐⭐⭐⭐⭐ |
| Sample (Testing) | Free | <1% | Never | ⭐⭐⭐ |

**Recommendation:** Use Statistics Canada for production (free + official).

## License

Postal code data sourced from:
- **Statistics Canada:** Open Government License
- **GeoNames:** Creative Commons Attribution 4.0
- **ZipCodeSoft:** Commercial license required

Ensure compliance with data source terms of use.

## Support

For issues with postal code import:
1. Check logs for specific errors
2. Verify CSV format matches requirements
3. Test with sample data first
4. Check PostGIS extension is enabled
5. Open GitHub issue with error details

---

**Last Updated:** January 2026
**Canadian Postal Codes:** ~876,000 active codes
