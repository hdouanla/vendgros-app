# Canadian Postal Codes Setup

This guide explains how to import Canadian postal codes into the database for proximity-based searches.

## Overview

The postal code system enables:
- Search listings by postal code + radius
- Auto-complete postal code lookups
- Distance calculations from postal code to listing
- City/province detection from postal code
- Fast geospatial queries using PostGIS

## Prerequisites

1. Database initialized with `pnpm db:init` (or at minimum `pnpm push && pnpm setup-postgis`)
2. Canadian postal code data in CSV format from ZipCodeSoft

## Step 1: Obtain Postal Code Data

Download from [ZipCodeSoft](https://www.zipcodesoft.com) - the most accurate and up-to-date Canadian postal code data:

1. Log in to your ZipCodeSoft customer area
2. Download the Canadian Postal Code Database CSV
3. Place at: `data/canadian-postal-codes.csv`

```bash
mkdir -p data
# Place your downloaded CSV at: data/canadian-postal-codes.csv
```

**Why ZipCodeSoft:**
- Most accurate coordinates
- Monthly updates available
- Complete coverage of all Canadian postal codes (~880K)
- Includes new postal codes as Canada Post adds them

Use the same data source for both local development and production.

## Step 2: CSV Format

ZipCodeSoft CSV format (semicolon-delimited):

```csv
countrycode;postalcode;city;province;provincecode;timezone;daylightsaving;latitude;longitude
CA;A0A 0A1;Avondale;Newfoundland;NL;GMT -03:30;Y;47.48721597;-53.0862281
```

All columns are imported:

| CSV Column | Database Column | Description |
|------------|-----------------|-------------|
| `countrycode` | `country_code` | Country code (CA) |
| `postalcode` | `code` | Postal code with space (M5H 2N2) |
| `city` | `city` | City name |
| `province` | `province_name` | Full province name (Ontario) |
| `provincecode` | `province` | 2-letter code (ON) |
| `timezone` | `timezone` | GMT offset (e.g., "GMT -05:00") |
| `daylightsaving` | `daylight_saving` | Observes DST (Y/N → true/false) |
| `latitude` | `latitude` | Decimal degrees |
| `longitude` | `longitude` | Decimal degrees |

## Step 3: Import Postal Codes

```bash
cd packages/db
pnpm import-postal-codes
```

Expected output:
```
Starting Canadian postal codes import...
✅ Imported 1003 postal codes (0 skipped, 3 deduped)...
✅ Imported 2003 postal codes (0 skipped, 3 deduped)...
...
✅ Imported 881393 postal codes (0 skipped, 1393 deduped)...

🎉 Import complete!
   Total imported: 881637 postal codes
   Skipped: 0 invalid entries
```

> **Note:** The "deduped" count shows duplicate postal codes in the CSV that were merged (later entries override earlier ones).

## Updating Data

The import script uses **upsert**, so you can safely re-run it with new data:

```bash
# 1. Download fresh CSV from ZipCodeSoft customer area
# 2. Replace the data file
cp ~/Downloads/canadian-postal-codes.csv data/canadian-postal-codes.csv

# 3. Re-import (updates existing, adds new)
cd packages/db
pnpm import-postal-codes
```

**For production server:**
```bash
# Upload new CSV to server
scp canadian-postal-codes.csv forge@vendgros.ca:/home/forge/vendgros.ca/current/data/

# SSH and re-import
ssh forge@vendgros.ca
cd /home/forge/vendgros.ca/current/packages/db
pnpm import-postal-codes
```

**What happens during update:**
- **New postal codes** → Inserted
- **Existing postal codes** → City, province, and coordinates updated
- **Removed postal codes** → Remain in database (not deleted)

**Recommended update frequency:** Quarterly or when ZipCodeSoft releases updates.

## Performance

With ~880K Canadian postal codes:
- **Storage:** ~100 MB
- **Import Time:** ~2 minutes (batches of 1,000 records)
- **Proximity Query:** < 50ms (with GiST spatial index)
- **Exact Lookup:** < 1ms (primary key)

## Troubleshooting

### Error: "CSV file not found"
- Ensure file exists at: `data/canadian-postal-codes.csv`
- Check path from project root

### Error: "POSTGRES_URL not set"
- Configure `.env.local` with database connection string

### Error: "PostGIS extension not found"
- Run `pnpm setup-postgis` first

### Invalid Postal Codes Skipped
- Only Canadian format accepted: `A1A 1A1`
- Check CSV format (semicolon-delimited)
- Verify headers match required columns

### Error: "parse error - invalid geometry"
- Run `pnpm setup-postgis` to ensure triggers use correct WKT format
- The trigger must use `ST_AsText()` to produce WKT format compatible with spatial indexes

### Error: "MAX_PARAMETERS_EXCEEDED"
- This is handled automatically with batch size of 1,000 records
- PostgreSQL has a 65,534 parameter limit per query

## License

Postal code data sourced from **ZipCodeSoft** (commercial license).

Ensure compliance with ZipCodeSoft terms of use for your subscription tier.
