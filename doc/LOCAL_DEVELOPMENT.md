[← Back to Documentation](./README.md) | [Production Deployment →](./PRODUCTION_DEPLOYMENT.md)

---

# Local Development Guide

Complete guide for setting up Vendgros locally for development.

## Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | ^22.21.0 | `node -v` |
| pnpm | ^10.19.0 | `pnpm -v` |
| PostgreSQL | 16+ with PostGIS | `psql --version` |
| Git | Latest | `git --version` |

## Quick Start

```bash
# 1. Clone the repository
git clone git@github.com:your-org/vendgros-app.git
cd vendgros-app

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Start development servers
pnpm dev
```

## Database Setup

### Option 1: Local PostgreSQL

1. **Install PostgreSQL with PostGIS**

   macOS (Homebrew):
   ```bash
   brew install postgresql@16 postgis
   brew services start postgresql@16
   ```

   Ubuntu/Debian:
   ```bash
   sudo apt install postgresql-16 postgresql-16-postgis-3
   sudo systemctl start postgresql
   ```

2. **Create the database**
   ```bash
   createdb vendgros-app
   psql -d vendgros-app -c "CREATE EXTENSION IF NOT EXISTS postgis;"
   ```

3. **Update `.env.local`**
   ```bash
   POSTGRES_URL="postgresql://postgres:@127.0.0.1:5432/vendgros-app"
   ```

### Option 2: Docker

```bash
docker run -d \
  --name vendgros-postgres \
  -e POSTGRES_DB=vendgros-app \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 5432:5432 \
  postgis/postgis:16-3.4
```

### Initialize Database

#### 1. Obtain Postal Code Data

The postal code CSV is not tracked in git. Download from [ZipCodeSoft](https://www.zipcodesoft.com) and place it at:

```bash
mkdir -p data
# Place your downloaded CSV at: data/canadian-postal-codes.csv
```

See `packages/db/README_POSTAL_CODES.md` for CSV format requirements.

#### 2. Run Database Initialization

```bash
cd packages/db

# Full database initialization (recommended)
pnpm db:init
```

#### What `db:init` Does

The `db:init` command runs three steps in sequence:

| Step | Command | What It Does |
|------|---------|--------------|
| 1 | `pnpm push` | Creates all database tables from Drizzle schema |
| 2 | `pnpm setup-postgis` | Installs PostGIS extension, creates triggers for auto-populating location columns, adds spatial indexes, and creates helper functions for proximity searches |
| 3 | `pnpm import-postal-codes` | Imports 880K+ Canadian postal codes for geolocation features |

#### Running Steps Individually

If you need more control, run each step separately:

```bash
cd packages/db

# 1. Push Drizzle schema to database (creates tables)
pnpm push

# 2. Setup PostGIS (extension, triggers, spatial indexes, helper functions)
pnpm setup-postgis

# 3. Import Canadian postal codes (880K+ records, ~2 minutes)
pnpm import-postal-codes

# 4. Seed sample data for development (optional)
pnpm db:seed
```

#### When to Re-run

| Scenario | Command |
|----------|---------|
| Fresh database / new clone | `pnpm db:init` |
| Schema changes only | `pnpm push` |
| Update postal codes | `pnpm import-postal-codes` |
| Reset everything | `pnpm db:reset && pnpm db:init` |

#### Updating Schema (Day-to-Day Development)

When you modify `packages/db/src/schema.ts`:

```bash
cd packages/db
pnpm push
```

Drizzle's `push` command safely handles:
- ✅ Adding new tables
- ✅ Adding new columns
- ✅ Adding indexes
- ⚠️ Renaming columns (prompts for confirmation)
- ⚠️ Changing column types (may require manual migration)

> **Note:** PostGIS triggers and spatial indexes persist across schema pushes. You only need to run `setup-postgis` once per database.

#### Updating Postal Codes

When you receive updated postal code data from ZipCodeSoft:

```bash
# 1. Replace the CSV file
cp ~/Downloads/canadian-postal-codes.csv data/canadian-postal-codes.csv

# 2. Re-import (upserts - updates existing, adds new)
cd packages/db
pnpm import-postal-codes
```

See `packages/db/README_POSTAL_CODES.md` for details on postal code updates.

## Environment Variables

Create a `.env.local` file in the root directory. Required variables:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_URL` | PostgreSQL connection string | `postgresql://postgres:@127.0.0.1:5432/vendgros-app` |
| `AUTH_SECRET` | Session encryption secret | Generate with `openssl rand -base64 32` |

### Optional (Feature-specific)

| Variable | Description | Get From |
|----------|-------------|----------|
| `RESEND_API_KEY` | Email verification (if empty, emails skip verification) | [resend.com/api-keys](https://resend.com/api-keys) |
| `TWILIO_ACCOUNT_SID` | SMS OTP | [twilio.com/console](https://www.twilio.com/console) |
| `TWILIO_AUTH_TOKEN` | SMS OTP | [twilio.com/console](https://www.twilio.com/console) |
| `TWILIO_FROM_NUMBER` | SMS sender number | [twilio.com/console](https://www.twilio.com/console) |
| `STRIPE_SECRET_KEY` | Payments | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments (client) | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Maps | [account.mapbox.com](https://account.mapbox.com/access-tokens) |
| `OPENAI_API_KEY` | AI moderation | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `DO_SPACES_*` | Image uploads | [cloud.digitalocean.com/spaces](https://cloud.digitalocean.com/spaces) |

## Development Servers

### Start All Services

```bash
pnpm dev
```

This starts:
- **Web App**: http://localhost:3000
- **API**: http://localhost:3000/api/trpc

### Start Specific Apps

```bash
# Next.js only (web + API)
pnpm dev:next

# Expo (mobile)
cd apps/expo && pnpm dev
```

## Project Structure

```
vendgros-app/
├── apps/
│   ├── nextjs/          # Next.js 15 web app
│   │   ├── src/app/     # App router pages
│   │   ├── src/components/
│   │   └── e2e/         # Playwright tests
│   └── expo/            # React Native mobile app
│
├── packages/
│   ├── api/             # tRPC API routers
│   ├── auth/            # better-auth configuration
│   ├── db/              # Drizzle ORM + schema
│   ├── ui/              # Shared React components
│   └── validators/      # Zod schemas
│
├── doc/                 # Documentation
└── turbo.json           # Turborepo config
```

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint issues |
| `pnpm format` | Check formatting |
| `pnpm format:fix` | Fix formatting |
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:studio` | Open Drizzle Studio (database GUI) |

### Database Commands (run from `packages/db`)

| Command | Description |
|---------|-------------|
| `pnpm db:init` | Full initialization (push + PostGIS + postal codes) |
| `pnpm push` | Push Drizzle schema changes to database |
| `pnpm setup-postgis` | Setup PostGIS triggers, indexes, and helper functions |
| `pnpm import-postal-codes` | Import Canadian postal codes (880K+ records) |
| `pnpm db:seed` | Seed homepage sample data |
| `pnpm db:reset` | Reset database (destructive) |

## Testing

### E2E Tests (Playwright)

```bash
cd apps/nextjs

# Run all tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Debug tests
pnpm test:e2e:debug
```

### Stripe Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login and forward webhooks
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check PostGIS extension
psql -d vendgros-app -c "SELECT PostGIS_Version();"
```

### Port Already in Use

```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Node Version Issues

```bash
# Use nvm to switch Node versions
nvm install 22
nvm use 22
```

### Clear Cache

```bash
# Clean all node_modules and build artifacts
pnpm clean
pnpm clean:workspaces
pnpm install
```

## IDE Setup

### VS Code Extensions (Recommended)

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Prisma (for schema highlighting)
- PostgreSQL

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

**Next**: [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md)
