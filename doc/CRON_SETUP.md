# Automated Reservation Expiry Setup

## Overview

Reservations automatically expire after 48 hours if payment is not completed. A cron job runs hourly to cancel expired reservations and return inventory to the listings.

This application is self-hosted on Digital Ocean infrastructure.

## Quick Setup (Automated Script)

For easy setup, use the provided script:

```bash
# Make sure you have CRON_SECRET in your .env file first
./scripts/setup-cron.sh
```

The script will guide you through setting up either:
1. Linux Cron (simple)
2. Systemd Timer (recommended for production)
3. External cron service (with command details)

## Manual Setup Instructions

### 1. Set Environment Variable

Add the `CRON_SECRET` environment variable to your deployment:

```bash
# Generate a secure random secret
openssl rand -base64 32
```

**On your Digital Ocean server:**
Add to your `.env` file or environment configuration:
```bash
CRON_SECRET="your-secure-secret-here"
```

**In local `.env`:**
```bash
CRON_SECRET="your-secret-here"
```

### 2. Linux Cron Setup (Recommended for Digital Ocean)

SSH into your Digital Ocean server and set up a cron job:

```bash
# Open crontab editor
crontab -e

# Add this line to run every hour at minute 0
0 * * * * curl -X POST https://your-domain.com/api/cron/cancel-expired-reservations -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/reservation-cleanup.log 2>&1
```

**Cron schedule examples:**
- `0 * * * *` - Every hour at minute 0
- `*/30 * * * *` - Every 30 minutes
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Every day at midnight

**Cron expression format:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-6, Sunday=0)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

**View cron logs:**
```bash
tail -f /var/log/reservation-cleanup.log
```

### 3. Alternative: Systemd Timer (More Reliable)

For more control and better logging, use systemd timers:

**Create service file:** `/etc/systemd/system/cancel-reservations.service`
```ini
[Unit]
Description=Cancel Expired Reservations
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X POST https://your-domain.com/api/cron/cancel-expired-reservations -H "Authorization: Bearer YOUR_CRON_SECRET"
StandardOutput=journal
StandardError=journal
```

**Create timer file:** `/etc/systemd/system/cancel-reservations.timer`
```ini
[Unit]
Description=Run reservation cleanup every hour
Requires=cancel-reservations.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable cancel-reservations.timer
sudo systemctl start cancel-reservations.timer

# Check status
sudo systemctl status cancel-reservations.timer
sudo systemctl list-timers

# View logs
sudo journalctl -u cancel-reservations.service -f
```

### 4. External Cron Service (Alternative)

If you prefer managed cron services:

**Recommended services:**
- [cron-job.org](https://cron-job.org) - Free, reliable
- [EasyCron](https://www.easycron.com) - Feature-rich
- [Cronitor](https://cronitor.io) - Includes monitoring

**Setup:**
1. Create account on your chosen service
2. Configure job to POST to:
   ```
   https://your-domain.com/api/cron/cancel-expired-reservations
   ```
3. Add HTTP header:
   ```
   Authorization: Bearer YOUR_CRON_SECRET
   ```
4. Set schedule: Every hour (or your preference)
5. Enable notifications for failures

### 5. Digital Ocean App Platform Functions (If Applicable)

If using Digital Ocean App Platform, you can use their Functions feature:

1. Create a function that calls your endpoint
2. Set up a scheduled trigger
3. Configure environment variables

## How It Works

### Cancellation Logic

1. **Find Expired Reservations**
   - Status: `PENDING`
   - `expiresAt` < current time

2. **For Each Expired Reservation**
   - Update status to `CANCELLED`
   - Set `completedAt` to current time
   - Return `quantityReserved` back to listing's `quantityAvailable`

3. **Transaction Safety**
   - All operations wrapped in database transaction
   - Ensures consistency if cancellation fails

### Response Format

```json
{
  "success": true,
  "cancelled": 5,
  "failed": 0,
  "message": "Cancelled 5 expired reservations",
  "details": [
    { "id": "reservation-id", "success": true }
  ]
}
```

## Testing

### Test the Endpoint Locally

```bash
# Set your CRON_SECRET in .env
export CRON_SECRET="your-secret"

# Call the endpoint
curl -X POST http://localhost:3000/api/cron/cancel-expired-reservations \
  -H "Authorization: Bearer your-secret"
```

### Test on Vercel

```bash
curl -X POST https://your-domain.com/api/cron/cancel-expired-reservations \
  -H "Authorization: Bearer your-secret"
```

### Health Check

```bash
# GET request returns endpoint status
curl https://your-domain.com/api/cron/cancel-expired-reservations
```

## Monitoring

### Check Logs

**Vercel:**
1. Go to your project
2. Navigate to "Cron" tab
3. View execution history and logs

**Local logs:**
```bash
# Terminal output will show:
# - Number of expired reservations found
# - Each cancellation attempt
# - Success/failure counts
```

### What to Monitor

- **Success rate**: Should be 100% under normal conditions
- **Cancellation count**: Track pattern over time
- **Execution time**: Should complete in < 10 seconds typically
- **Errors**: Any failed cancellations need investigation

## Troubleshooting

### Cron Not Running

1. Check `CRON_SECRET` is set in environment variables
2. Verify `vercel.json` is in the correct location (`apps/nextjs/`)
3. Redeploy the application
4. Check Vercel Dashboard > Cron for errors

### Unauthorized Error

- Ensure `Authorization` header matches `CRON_SECRET`
- Verify environment variable is set in the correct environment

### Database Errors

- Check database connection
- Verify schema matches expected structure
- Review transaction logs for specific errors

## Security

- ✅ Endpoint requires authorization token
- ✅ Secret stored in environment variables
- ✅ No public access without valid token
- ✅ All operations in database transactions

**Important:** Keep your `CRON_SECRET` secure and rotate it periodically.
