[← Local Development](./LOCAL_DEVELOPMENT.md) | [Back to Documentation](./README.md) | [Mobile Deployment →](./MOBILE_DEPLOYMENT.md)

---

# Production Deployment Guide

Complete guide for deploying Vendgros to production using Laravel Forge.

## Infrastructure Overview

| Component | Service | Purpose |
|-----------|---------|---------|
| Server | Laravel Forge | Server provisioning & deployment |
| Runtime | PM2 | Node.js process manager |
| Database | PostgreSQL 16 + PostGIS | Data storage |
| Storage | DigitalOcean Spaces | Image uploads (S3-compatible) |
| CDN | Cloudflare | SSL, caching, DDoS protection |

## Prerequisites

- Laravel Forge account with server provisioned
- PostgreSQL 16 database with PostGIS extension
- Domain configured in Cloudflare
- All third-party API keys ready

## Server Setup (Forge)

### 1. Create Site in Forge

1. Go to your server in Forge
2. Click **New Site**
3. Configure:
   - **Domain**: `vendgros.ca` (or your domain)
   - **Project Type**: Static HTML / General PHP (we'll customize)
   - **Web Directory**: `/apps/nextjs/.next`

### 2. Configure Deployment Script

In Forge, go to **Site > Deployments** and set the deployment script:

```bash
cd /home/forge/vendgros.ca/current

# Install dependencies
pnpm install --frozen-lockfile

# Build all packages
pnpm build

# Run database schema updates
cd packages/db
pnpm push

# Restart PM2
cd /home/forge/vendgros.ca/current
pm2 restart vendgros || pm2 start ecosystem.config.js
```

> **Important:** This deployment script handles **subsequent deployments** only. For **first deployment**, you must also run `pnpm setup-postgis` and `pnpm import-postal-codes` manually after the initial deploy. See [First Deployment](#first-deployment-full-initialization) below.

### 3. Create PM2 Ecosystem File

Create `ecosystem.config.js` in the project root:

```javascript
module.exports = {
  apps: [
    {
      name: 'vendgros',
      cwd: '/home/forge/vendgros.ca/current/apps/nextjs',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

### 4. Configure Nginx

In Forge, go to **Site > Nginx** and update the configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name vendgros.ca www.vendgros.ca;

    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name vendgros.ca www.vendgros.ca;

    ssl_certificate /etc/nginx/ssl/vendgros.ca/server.crt;
    ssl_certificate_key /etc/nginx/ssl/vendgros.ca/server.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /_next/static {
        alias /home/forge/vendgros.ca/current/apps/nextjs/.next/static;
        expires 365d;
        access_log off;
    }
}
```

## Environment Variables

### Set in Forge

Go to **Site > Environment** and add:

```bash
# Database
POSTGRES_URL="postgresql://user:password@host:5432/vendgros?sslmode=require"

# Authentication (REQUIRED)
AUTH_SECRET="generate-with-openssl-rand-base64-32"

# Cron Jobs
CRON_SECRET="generate-with-openssl-rand-base64-32"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Twilio (SMS)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_FROM_NUMBER="+1..."

# Resend (Email)
RESEND_API_KEY="re_..."

# DigitalOcean Spaces
DO_SPACES_KEY="..."
DO_SPACES_SECRET="..."
DO_SPACES_ENDPOINT="https://tor1.digitaloceanspaces.com"
DO_SPACES_BUCKET="vendgros"
DO_SPACES_REGION="tor1"
DO_SPACES_URL="https://vendgros.tor1.digitaloceanspaces.com"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk.ey..."

# OpenAI
OPENAI_API_KEY="sk-..."

# App Settings
NEXT_PUBLIC_RESERVATION_PAYMENT_TIMEOUT_MINUTES=20
NODE_ENV=production
```

### Generate Secrets

```bash
# Generate AUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -base64 32
```

## Database Setup

### First Deployment (Full Initialization) {#first-deployment-full-initialization}

#### 1. Upload Postal Code Data

The postal code CSV is not tracked in git. Upload it to the server manually:

1. Download the latest Canadian postal codes from [ZipCodeSoft](https://www.zipcodesoft.com) (customer area)
2. Upload to server:

```bash
# On server: create data directory
ssh forge@vendgros.ca "mkdir -p /home/forge/vendgros.ca/current/data"

# From local machine: upload CSV
scp canadian-postal-codes.csv forge@vendgros.ca:/home/forge/vendgros.ca/current/data/
```

See `packages/db/README_POSTAL_CODES.md` for CSV format requirements.

#### 2. Initialize Database

```bash
cd /home/forge/vendgros.ca/current/packages/db

# Full database initialization
pnpm db:init
```

#### What `db:init` Does

The `db:init` command runs three steps in sequence:

| Step | Command | What It Does |
|------|---------|--------------|
| 1 | `pnpm push` | Creates all database tables from Drizzle schema |
| 2 | `pnpm setup-postgis` | Installs PostGIS extension, creates triggers for auto-populating location columns, adds spatial indexes (GiST), and creates helper functions (`find_listings_near_point()`, etc.) |
| 3 | `pnpm import-postal-codes` | Imports 880K+ Canadian postal codes for geolocation features |

#### Running Steps Individually

If you need more control or are troubleshooting:

```bash
cd /home/forge/vendgros.ca/current/packages/db

# 1. Push Drizzle schema (creates all tables)
pnpm push

# 2. Setup PostGIS (extension, triggers, spatial indexes, helper functions)
pnpm setup-postgis

# 3. Import Canadian postal codes (880K+ records, ~2 minutes)
pnpm import-postal-codes
```

### Subsequent Deployments

#### Schema Updates

Schema changes are applied automatically during deployment via the deployment script. For manual updates:

```bash
cd /home/forge/vendgros.ca/current/packages/db
pnpm push
```

> **Note:** `pnpm push` uses Drizzle's push strategy which safely adds new columns/tables without data loss. PostGIS setup only needs to run once - triggers and spatial indexes persist across deployments.

#### Updating Postal Codes

When ZipCodeSoft releases updated postal code data (recommended: quarterly):

```bash
# 1. Upload new CSV to server
scp canadian-postal-codes.csv forge@vendgros.ca:/home/forge/vendgros.ca/current/data/

# 2. SSH and re-import (upserts - updates existing, adds new)
ssh forge@vendgros.ca
cd /home/forge/vendgros.ca/current/packages/db
pnpm import-postal-codes
```

The import is non-destructive:
- **New postal codes** → Inserted
- **Existing postal codes** → Updated (city, coordinates, etc.)
- **Removed postal codes** → Remain in database

See `packages/db/README_POSTAL_CODES.md` for details.

### Server Update Summary

| Scenario | What to Run | When |
|----------|-------------|------|
| **First deployment** | `pnpm db:init` (or push + setup-postgis + import-postal-codes) | Once per new server/database |
| **Code deployment** | Automatic via Forge (runs `pnpm push`) | Every git push |
| **Schema changes** | Automatic via deployment script | Every deployment |
| **Postal code update** | Manual: scp CSV + `pnpm import-postal-codes` | Quarterly (or when data updated) |
| **PostGIS changes** | Manual: `pnpm setup-postgis` | Only if triggers/functions change |

## PM2 Management

### Common Commands

```bash
# View running processes
pm2 list

# View logs
pm2 logs vendgros

# Restart application
pm2 restart vendgros

# Stop application
pm2 stop vendgros

# Delete process
pm2 delete vendgros

# Save current process list (persists across reboots)
pm2 save

# Setup startup script
pm2 startup
```

### Monitor Performance

```bash
pm2 monit
```

## Cron Jobs

### Configure in Forge

Go to **Server > Scheduler** and add:

| Schedule | Command | Description |
|----------|---------|-------------|
| `* * * * *` | `curl -s https://vendgros.ca/api/cron/check-expired` | Check expired listings |
| `0 * * * *` | `curl -s https://vendgros.ca/api/cron/cleanup` | Hourly cleanup |

### Secure Cron Endpoints

All cron endpoints require the `CRON_SECRET` header:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://vendgros.ca/api/cron/check-expired
```

## Cloudflare Configuration

### DNS Records

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | `<server-ip>` | Yes |
| CNAME | www | vendgros.ca | Yes |

### SSL/TLS Settings

1. Go to **SSL/TLS > Overview**
2. Set mode to **Full (strict)**
3. Enable:
   - Always Use HTTPS
   - Automatic HTTPS Rewrites
   - TLS 1.3

### Page Rules

**Cache Static Assets:**
```
URL: vendgros.ca/_next/static/*
Setting: Cache Level = Cache Everything, Edge TTL = 1 month
```

**Bypass API Cache:**
```
URL: vendgros.ca/api/*
Setting: Cache Level = Bypass
```

## Stripe Webhooks

### Configure in Stripe Dashboard

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://vendgros.ca/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Troubleshooting

### Build Failures

**Missing AUTH_SECRET:**
```
Invalid environment variables: AUTH_SECRET
```
Solution: Add `AUTH_SECRET` to `.env.local` or Forge environment variables.

**PM2 Config Not Found:**
```
[PM2][ERROR] File not found
```
Solution: Recreate PM2 process:
```bash
cd /home/forge/vendgros.ca/current/apps/nextjs
pm2 start npm --name "vendgros" -- start
pm2 save
```

### Application Not Starting

Check PM2 logs:
```bash
pm2 logs vendgros --lines 100
```

Check Nginx error logs:
```bash
tail -f /var/log/nginx/error.log
```

### Database Connection Issues

Test connection:
```bash
psql "$POSTGRES_URL" -c "SELECT 1"
```

Check PostGIS:
```bash
psql "$POSTGRES_URL" -c "SELECT PostGIS_Version();"
```

### Deployment Stuck

Reset PM2:
```bash
pm2 kill
pm2 start ecosystem.config.js
pm2 save
```

## Rollback Procedure

Forge keeps previous releases. To rollback:

1. Go to **Site > Deployments**
2. Find the last working deployment
3. Click **Rollback**

Or manually:
```bash
cd /home/forge/vendgros.ca
ln -sfn releases/<previous-release-id> current
pm2 restart vendgros
```

## Health Checks

### Application Health

```bash
curl https://vendgros.ca/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-23T12:00:00Z"
}
```

### Uptime Monitoring

Configure external monitoring (UptimeRobot, Pingdom) for:
- `https://vendgros.ca` - Main site
- `https://vendgros.ca/api/health` - API health

## Security Checklist

- [ ] AUTH_SECRET is unique and secure (32+ characters)
- [ ] CRON_SECRET is unique and secure
- [ ] All API keys are production keys (not test)
- [ ] HTTPS enforced (Cloudflare Full Strict)
- [ ] Database SSL enabled
- [ ] Firewall configured (only 80, 443 open)
- [ ] Environment variables not in git
- [ ] Stripe webhook secret configured

---

**Previous**: [Local Development Guide](./LOCAL_DEVELOPMENT.md)
**Related**: [Mobile Deployment Guide](./MOBILE_DEPLOYMENT.md)
