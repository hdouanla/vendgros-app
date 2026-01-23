# @acme/db - Vendgros Database Package

Database schema, migrations, and scripts for Vendgros.

## Quick Start

```bash
# Full database initialization (recommended for first-time setup)
pnpm db:init
```

This single command runs all three setup steps in order:
1. `pnpm push` - Creates all tables via Drizzle schema
2. `pnpm setup-postgis` - Sets up PostGIS features (triggers, indexes, functions)
3. `pnpm import-postal-codes` - Imports 880K+ Canadian postal codes

## Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm db:init` | **Full initialization** - Run this for new databases |
| `pnpm push` | Push Drizzle schema changes to database |
| `pnpm setup-postgis` | Setup PostGIS triggers, indexes, and helper functions |
| `pnpm import-postal-codes` | Import Canadian postal codes (~5 min) |
| `pnpm db:seed` | Seed sample data for development |
| `pnpm db:reset` | Reset database (destructive - drops all data) |
| `pnpm studio` | Open Drizzle Studio (database GUI) |

## Database Architecture

### Schema Management: Drizzle ORM

Tables are defined in `src/schema.ts` and pushed to the database using:

```bash
pnpm push
```

This uses Drizzle's "push" strategy which:
- Creates new tables and columns automatically
- Safely handles schema changes without data loss
- Does NOT require migration files for development

### PostGIS Features

PostGIS features that Drizzle cannot handle are managed separately in `migrations/0001_initial_postgis_setup.sql`:

| Feature | Purpose |
|---------|---------|
| PostGIS Extension | Enables spatial data types and functions |
| Trigger Functions | Auto-populate `location` POINT column from lat/lng |
| Triggers | Run on INSERT/UPDATE for `listing` and `postal_code` tables |
| GiST Indexes | Fast spatial queries for proximity searches |
| Helper Functions | `find_listings_near_point()`, `find_postal_codes_near_point()`, etc. |

Run PostGIS setup with:

```bash
pnpm setup-postgis
```

## When to Run Each Command

### New Database (First Time)

```bash
pnpm db:init  # Does everything
```

### After Schema Changes

```bash
pnpm push     # Just update the schema
```

### After Cloning/Fresh Install

```bash
pnpm db:init  # Full setup needed
```

### Re-importing Postal Codes

```bash
pnpm import-postal-codes  # Safe to re-run (uses upsert)
```

## Files Structure

```
packages/db/
├── src/
│   ├── schema.ts              # Drizzle table definitions
│   ├── schema-extensions.ts   # Extended schemas with relations
│   ├── client.ts              # Database client
│   └── scripts/
│       ├── setup-postgis.ts   # PostGIS setup script
│       ├── import-postal-codes.ts
│       ├── seed-homepage-data.ts
│       └── reset-database.ts
├── migrations/
│   └── 0001_initial_postgis_setup.sql  # PostGIS setup SQL
└── drizzle.config.ts          # Drizzle configuration
```

## Troubleshooting

### Check PostGIS is Installed

```bash
psql -d vendgros-app -c "SELECT PostGIS_Version();"
```

### Verify Spatial Indexes

```bash
psql -d vendgros-app -c "\di *gist*"
```

### Test Proximity Search

```sql
SELECT * FROM find_postal_codes_near_point(43.65, -79.38, 10);
```
