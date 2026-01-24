# Maintenance Mode

## Enable or disable offline mode

- Set `MAINTENANCE_MODE=true` to show the offline page for all visitors.
- Set `MAINTENANCE_MODE=false` to restore normal access.
- Restart the Next.js server after changing the value.

## View the site while maintenance mode is on

- Open `/maintenance-unlock?key=YOUR_KEY` in your browser to unlock the site for the current session.
- The key is configured via `MAINTENANCE_UNLOCK_KEY` environment variable.
- Default key (if not set): `vg_offline_unlocked`
- Use a private window or clear cookies to see the offline page again.

Example: `/maintenance-unlock?key=vg_offline_unlocked`
