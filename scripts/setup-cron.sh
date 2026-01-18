#!/bin/bash

# Setup script for reservation expiry cron job
# Usage: ./scripts/setup-cron.sh

set -e

echo "=========================================="
echo "Reservation Expiry Cron Setup"
echo "=========================================="
echo ""

# Check if CRON_SECRET exists in .env
if [ -f .env ]; then
    if grep -q "CRON_SECRET=" .env; then
        echo "✓ CRON_SECRET found in .env"
    else
        echo "⚠ CRON_SECRET not found in .env"
        echo ""
        echo "Generate a secure secret:"
        echo "  openssl rand -base64 32"
        echo ""
        echo "Add it to your .env file:"
        echo "  CRON_SECRET=\"your-generated-secret\""
        exit 1
    fi
else
    echo "⚠ .env file not found"
    echo "Create .env from .env.example first"
    exit 1
fi

# Prompt for domain
echo ""
read -p "Enter your domain (e.g., vendgros.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "Error: Domain is required"
    exit 1
fi

# Extract CRON_SECRET from .env
CRON_SECRET=$(grep "CRON_SECRET=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$CRON_SECRET" ]; then
    echo "Error: CRON_SECRET is empty in .env"
    exit 1
fi

echo ""
echo "=========================================="
echo "Choose Setup Method:"
echo "=========================================="
echo "1. Linux Cron (Simple)"
echo "2. Systemd Timer (Recommended)"
echo "3. Show command for external service"
echo ""
read -p "Enter choice (1-3): " CHOICE

case $CHOICE in
    1)
        echo ""
        echo "Adding to crontab..."

        # Create cron command
        CRON_CMD="0 * * * * curl -X POST https://$DOMAIN/api/cron/cancel-expired-reservations -H \"Authorization: Bearer $CRON_SECRET\" >> /var/log/reservation-cleanup.log 2>&1"

        # Check if already exists
        if crontab -l 2>/dev/null | grep -q "cancel-expired-reservations"; then
            echo "⚠ Cron job already exists"
            read -p "Replace it? (y/n): " REPLACE
            if [ "$REPLACE" = "y" ]; then
                # Remove old entry and add new one
                (crontab -l 2>/dev/null | grep -v "cancel-expired-reservations"; echo "$CRON_CMD") | crontab -
                echo "✓ Cron job updated"
            else
                echo "Skipped"
            fi
        else
            # Add new entry
            (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
            echo "✓ Cron job added"
        fi

        echo ""
        echo "Current crontab:"
        crontab -l | grep "cancel-expired-reservations"
        echo ""
        echo "View logs with:"
        echo "  tail -f /var/log/reservation-cleanup.log"
        ;;

    2)
        echo ""
        echo "Creating systemd service..."

        # Create service file content
        cat > /tmp/cancel-reservations.service <<EOF
[Unit]
Description=Cancel Expired Reservations
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X POST https://$DOMAIN/api/cron/cancel-expired-reservations -H "Authorization: Bearer $CRON_SECRET"
StandardOutput=journal
StandardError=journal
EOF

        # Create timer file content
        cat > /tmp/cancel-reservations.timer <<EOF
[Unit]
Description=Run reservation cleanup every hour
Requires=cancel-reservations.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

        echo ""
        echo "Service files created in /tmp/"
        echo ""
        echo "Run these commands as root:"
        echo ""
        echo "  sudo mv /tmp/cancel-reservations.service /etc/systemd/system/"
        echo "  sudo mv /tmp/cancel-reservations.timer /etc/systemd/system/"
        echo "  sudo systemctl daemon-reload"
        echo "  sudo systemctl enable cancel-reservations.timer"
        echo "  sudo systemctl start cancel-reservations.timer"
        echo ""
        echo "Check status:"
        echo "  sudo systemctl status cancel-reservations.timer"
        echo "  sudo systemctl list-timers"
        echo ""
        echo "View logs:"
        echo "  sudo journalctl -u cancel-reservations.service -f"
        ;;

    3)
        echo ""
        echo "=========================================="
        echo "External Cron Service Setup"
        echo "=========================================="
        echo ""
        echo "Endpoint URL:"
        echo "  https://$DOMAIN/api/cron/cancel-expired-reservations"
        echo ""
        echo "Method:"
        echo "  POST"
        echo ""
        echo "Authorization Header:"
        echo "  Authorization: Bearer $CRON_SECRET"
        echo ""
        echo "Schedule (cron expression):"
        echo "  0 * * * *"
        echo ""
        echo "Recommended services:"
        echo "  - https://cron-job.org (Free)"
        echo "  - https://www.easycron.com"
        echo "  - https://cronitor.io"
        ;;

    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Test the endpoint manually:"
echo "  curl -X POST https://$DOMAIN/api/cron/cancel-expired-reservations \\"
echo "    -H \"Authorization: Bearer $CRON_SECRET\""
echo ""
