# Vendgros - Deployment Guide

This guide covers deploying the Vendgros marketplace to production using DigitalOcean App Platform and Cloudflare CDN.

## Prerequisites

- DigitalOcean account
- Cloudflare account
- GitHub repository with the codebase
- All third-party API keys (Stripe, Twilio, Resend, Mapbox)

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Database Setup](#database-setup)
3. [DigitalOcean Spaces (S3)](#digitalocean-spaces)
4. [App Platform Deployment](#app-platform-deployment)
5. [Cloudflare CDN Setup](#cloudflare-cdn-setup)
6. [Domain Configuration](#domain-configuration)
7. [Post-Deployment Tasks](#post-deployment-tasks)
8. [Monitoring and Logging](#monitoring-and-logging)

---

## Environment Setup

### Required Environment Variables

Create a `.env` file in production with these variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://vendgros.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio (SMS)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Resend (Email)
RESEND_API_KEY=re_...

# DigitalOcean Spaces
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_ENDPOINT=https://tor1.digitaloceanspaces.com
DO_SPACES_BUCKET=vendgros
DO_SPACES_REGION=tor1
DO_SPACES_URL=https://vendgros.tor1.digitaloceanspaces.com

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...

# API URL
NEXT_PUBLIC_API_URL=https://vendgros.com
```

### Environment Variable Security

1. **Never commit `.env` files** - they're gitignored
2. Store secrets in DigitalOcean App Platform's encrypted environment variables
3. Use different keys for production vs development
4. Rotate secrets regularly (every 90 days recommended)

---

## Database Setup

### 1. Create PostgreSQL Database

On DigitalOcean:
```bash
doctl databases create vendgros-postgres \
  --engine pg \
  --version 16 \
  --region tor1 \
  --size db-s-1vcpu-1gb \
  --num-nodes 1
```

### 2. Enable PostGIS Extension

Connect to the database and run:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### 3. Run Migrations

```bash
cd packages/db
pnpm db:push
```

### 4. Import Postal Codes

```bash
pnpm tsx scripts/import-postal-codes.ts
```

### 5. Database Backups

Configure automatic daily backups:
```bash
doctl databases backups create vendgros-postgres
```

---

## DigitalOcean Spaces

### 1. Create Space

```bash
doctl spaces create vendgros \
  --region tor1
```

### 2. Configure CORS

Create `cors.json`:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://vendgros.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Apply CORS:
```bash
s3cmd setcors cors.json s3://vendgros
```

### 3. Create Folders

```bash
s3cmd mb s3://vendgros/listings/
s3cmd mb s3://vendgros/profiles/
```

### 4. Set CDN

Enable CDN on the Space for faster global delivery.

---

## App Platform Deployment

### 1. Connect GitHub Repository

1. Go to DigitalOcean App Platform
2. Click "Create App"
3. Connect GitHub repository
4. Select the `main` branch

### 2. Configure App Spec

Use the provided `.do/app.yaml` configuration:

```bash
doctl apps create --spec .do/app.yaml
```

### 3. Add Environment Variables

In the DigitalOcean dashboard:
1. Go to App Settings > Environment Variables
2. Add all required variables from the list above
3. Mark sensitive variables as "secret"

### 4. Deploy

```bash
doctl apps create-deployment <app-id>
```

Or enable auto-deploy on push to `main` branch.

### 5. Health Checks

The app includes health check endpoints:
- Web: `GET /api/health`
- API: `GET /health`

These return:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T12:00:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## Cloudflare CDN Setup

### 1. Add Domain to Cloudflare

1. Log in to Cloudflare
2. Add site: `vendgros.com`
3. Update nameservers at your domain registrar

### 2. Configure DNS Records

Add these DNS records:
```
Type: A
Name: @
Value: <DigitalOcean-App-IP>
Proxied: Yes

Type: CNAME
Name: www
Value: vendgros.com
Proxied: Yes

Type: CNAME
Name: cdn
Value: vendgros.tor1.cdn.digitaloceanspaces.com
Proxied: Yes
```

### 3. SSL/TLS Configuration

1. Go to SSL/TLS settings
2. Select "Full (strict)" mode
3. Enable "Always Use HTTPS"
4. Enable "Automatic HTTPS Rewrites"

### 4. Page Rules

Create these page rules:

**Cache Everything:**
```
URL: cdn.vendgros.com/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

**API No Cache:**
```
URL: vendgros.com/api/*
Settings:
  - Cache Level: Bypass
```

### 5. Performance Optimization

Enable these features:
- Auto Minify (JS, CSS, HTML)
- Brotli compression
- HTTP/2
- HTTP/3 (QUIC)
- Early Hints

---

## Domain Configuration

### 1. SSL Certificate

DigitalOcean App Platform automatically provisions Let's Encrypt certificates.

Verify:
```bash
curl -I https://vendgros.com
```

### 2. WWW Redirect

Configure redirect from `www.vendgros.com` to `vendgros.com`:

In Cloudflare Page Rules:
```
URL: www.vendgros.com/*
Setting: Forwarding URL (301)
Destination: https://vendgros.com/$1
```

### 3. Subdomain Setup

If using subdomains:
```
api.vendgros.com → API service
admin.vendgros.com → Admin panel
cdn.vendgros.com → CDN assets
```

---

## Post-Deployment Tasks

### 1. Stripe Webhook Configuration

Update Stripe webhook URL:
```
https://vendgros.com/api/webhooks/stripe
```

Events to listen for:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

### 2. Verify Email/SMS Services

Test notifications:
```bash
curl -X POST https://vendgros.com/api/test/notification \
  -H "Content-Type: application/json" \
  -d '{"type":"email","recipient":"test@example.com"}'
```

### 3. Import Initial Data

If needed, import seed data:
```bash
pnpm tsx scripts/seed-production.ts
```

### 4. Create Admin User

```bash
pnpm tsx scripts/create-admin.ts \
  --email admin@vendgros.com \
  --phone +15551234567
```

### 5. Test Critical Flows

Run E2E tests against production:
```bash
PLAYWRIGHT_TEST_BASE_URL=https://vendgros.com pnpm test:e2e
```

---

## Monitoring and Logging

### 1. Application Metrics

Monitor via DigitalOcean dashboard:
- CPU usage
- Memory usage
- Request count
- Response time
- Error rate

### 2. Database Monitoring

Track:
- Connection pool usage
- Query performance
- Slow query log
- Disk usage

### 3. Error Tracking

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Datadog for APM

### 4. Uptime Monitoring

Set up external monitoring:
- UptimeRobot
- Pingdom
- StatusCake

Configure alerts for:
- HTTP 5xx errors
- Response time > 2s
- Uptime < 99.9%

### 5. Log Aggregation

DigitalOcean provides built-in logging:
```bash
doctl apps logs <app-id>
```

For production, consider:
- Papertrail
- Loggly
- ELK Stack

---

## Scaling Considerations

### Horizontal Scaling

Increase instance count in `.do/app.yaml`:
```yaml
instance_count: 4  # Scale from 2 to 4
```

### Vertical Scaling

Upgrade instance size:
```yaml
instance_size_slug: professional-xs  # Upgrade from basic-xs
```

### Database Scaling

For high traffic:
```bash
doctl databases resize vendgros-postgres \
  --size db-s-2vcpu-4gb \
  --num-nodes 2
```

### CDN Scaling

Cloudflare automatically scales with traffic. Consider:
- Argo Smart Routing for faster routing
- Workers for edge computing
- Load Balancing for multi-region

---

## Rollback Procedure

If deployment fails:

```bash
# List deployments
doctl apps list-deployments <app-id>

# Rollback to previous deployment
doctl apps create-deployment <app-id> --deployment-id <previous-deployment-id>
```

---

## Security Checklist

- [ ] All environment variables encrypted
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Database SSL enabled
- [ ] API rate limiting enabled
- [ ] DDoS protection active (Cloudflare)
- [ ] Security headers configured
- [ ] Regular security audits scheduled
- [ ] Dependency updates automated

---

## Cost Estimation

### DigitalOcean App Platform

- Web service (2x basic-xs): $12/month
- API service (2x basic-xs): $12/month
- Worker (1x basic-xxs): $5/month
- PostgreSQL (basic): $15/month
- Spaces (50GB): $5/month
- Bandwidth: ~$0.01/GB

**Total: ~$50/month** for starter traffic

### Cloudflare

- Free plan includes:
  - Unlimited bandwidth
  - SSL certificate
  - DDoS protection
  - Basic CDN

### Third-Party Services

- Stripe: 2.9% + $0.30 per transaction
- Twilio: $0.0075 per SMS
- Resend: $0 for first 3,000 emails/month
- Mapbox: $0 for first 50,000 requests/month

---

## Support and Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check database status
doctl databases get vendgros-postgres

# Restart database
doctl databases restart vendgros-postgres
```

**Deployment Failures:**
```bash
# Check build logs
doctl apps logs <app-id> --type build

# Check runtime logs
doctl apps logs <app-id> --type run
```

**SSL Certificate Issues:**
```bash
# Force certificate renewal
doctl apps update <app-id> --force-https
```

### Getting Help

- DigitalOcean Support: https://cloud.digitalocean.com/support
- Community Forums: https://www.digitalocean.com/community
- Documentation: https://docs.digitalocean.com

---

## Maintenance Schedule

### Daily

- Monitor error rates
- Check application logs
- Review performance metrics

### Weekly

- Review database slow queries
- Check disk usage
- Update dependencies (if needed)

### Monthly

- Review and optimize costs
- Security audit
- Backup verification
- Performance optimization

### Quarterly

- Rotate secrets
- Update SSL certificates
- Capacity planning
- Disaster recovery drill

---

## Next Steps

After successful deployment:

1. **Mobile App Deployment** - See [MOBILE_DEPLOYMENT.md](./MOBILE_DEPLOYMENT.md)
2. **API Documentation** - Generate and publish API docs
3. **User Training** - Create help center and guides
4. **Marketing Launch** - Announce platform launch
5. **Monitoring Setup** - Configure comprehensive monitoring

---

**Deployment checklist completed!** 🚀

For questions or issues, contact the development team.
