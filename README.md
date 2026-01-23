# Vendgros

A local marketplace connecting bulk sellers (restaurants, bakeries, farms) with cost-conscious buyers.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Push database schema
pnpm db:push

# Start development
pnpm dev
```

**Web App**: http://localhost:3000

## Tech Stack

- **Frontend**: Next.js 15, Expo (React Native), TypeScript, Tailwind CSS
- **Backend**: tRPC, PostgreSQL 16 + PostGIS, Drizzle ORM, better-auth
- **Infrastructure**: Laravel Forge, PM2, Cloudflare, DigitalOcean Spaces

## Documentation

| Guide | Description |
|-------|-------------|
| [Local Development](./doc/LOCAL_DEVELOPMENT.md) | Set up your local environment |
| [Production Deployment](./doc/PRODUCTION_DEPLOYMENT.md) | Deploy with Laravel Forge |
| [Mobile Deployment](./doc/MOBILE_DEPLOYMENT.md) | iOS and Android deployment |
| [API Reference](./doc/reference/API_REFERENCE.md) | tRPC API documentation |

## Project Structure

```
vendgros-app/
├── apps/
│   ├── nextjs/       # Web application
│   └── expo/         # Mobile application
├── packages/
│   ├── api/          # tRPC API routers
│   ├── auth/         # Authentication
│   ├── db/           # Database schema
│   ├── ui/           # Shared components
│   └── validators/   # Zod schemas
└── doc/              # Documentation
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development servers |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type check |
| `pnpm lint` | Run linter |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open database GUI |

## License

MIT
