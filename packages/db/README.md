# Vendgros - Community Bulk Sales Marketplace

A community-driven marketplace for bulk sales of surplus items (groceries, clothing, electronics, etc.) connecting sellers with nearby buyers. Built with the T3 Stack.

## Features

### Core Functionality
- **Dual Verification**: Email + SMS OTP authentication for all users
- **Geospatial Search**: Find listings within specified radius using PostGIS
- **5% Deposit System**: Buyers pay 5% deposit via Stripe, 95% balance at pickup
- **QR Code Verification**: Secure pickup verification with QR codes and backup PIN
- **Blind Rating System**: Bi-directional ratings hidden until both parties submit
- **Multi-Channel Notifications**: Email, SMS, and push notifications for all key events
- **Admin Moderation**: Listing approval/rejection and user management

### Tech Stack
- **Frontend (Web)**: Next.js 15 with App Router, shadcn/ui, TailwindCSS
- **Frontend (Mobile)**: React Native/Expo with NativeWind
- **API**: tRPC v11 for type-safe API
- **Database**: PostgreSQL 16 with PostGIS for geospatial queries
- **ORM**: Drizzle ORM with automatic migrations
- **Auth**: better-auth with OTP plugin
- **Payments**: Stripe for deposit processing
- **Notifications**: Resend (email), Twilio (SMS), Expo Push (mobile)
- **Monorepo**: Turborepo for workspace management

## Prerequisites

- **Node.js**: v20+ (LTS recommended)
- **pnpm**: v10+ (\`npm install -g pnpm\`)
- **PostgreSQL**: 16+ with PostGIS extension

### Required API Keys
- **Stripe**: For payment processing
- **Resend**: For email OTP and notifications
- **Twilio**: For SMS OTP

## Quick Start

1. **Clone and install**:
   \`\`\`bash
   git clone <repository-url>
   cd vendgros-app
   pnpm install
   \`\`\`

2. **Configure environment**:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your database and API credentials
   \`\`\`

3. **Set up database**:
   \`\`\`bash
   # Run migrations
   pnpm --filter @acme/db db:migrate

   # Import sample postal codes for development
   # (See packages/db/README_POSTAL_CODES.md for production setup)
   mkdir -p data
   cp packages/db/sample-postal-codes.csv data/canadian-postal-codes.csv
   pnpm --filter @acme/db import-postal-codes
   \`\`\`

4. **Start development**:
   \`\`\`bash
   pnpm dev
   \`\`\`

Visit http://localhost:3000 for the web app.

## Documentation

- **Setup Guide**: See `.env.example` for required environment variables
- **Postal Codes Setup**: See `packages/db/README_POSTAL_CODES.md` for importing Canadian postal codes
- **Project Plan**: See `doc/PROJECT_PLAN.md` for implementation roadmap
- **API Documentation**: All routes in `packages/api/src/router/`

## Development

### Database Migrations

\`\`\`bash
pnpm --filter @acme/db db:generate  # Generate migration
pnpm --filter @acme/db db:migrate   # Apply migration
\`\`\`

### Testing Stripe

\`\`\`bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Use test card: 4242 4242 4242 4242
\`\`\`

## License

MIT
