-- Performance Optimization Indexes for Vendgros
-- Run this migration to improve query performance across the platform

-- ============================================================================
-- LISTING INDEXES
-- ============================================================================

-- Composite index for geospatial + status queries (most common search pattern)
CREATE INDEX IF NOT EXISTS idx_listing_status_location ON "Listing"(status, latitude, longitude)
WHERE status = 'PUBLISHED';

-- Index for seller's listings queries
CREATE INDEX IF NOT EXISTS idx_listing_seller_status_created ON "Listing"(seller_id, status, created_at DESC);

-- Index for category filtering with status
CREATE INDEX IF NOT EXISTS idx_listing_category_status ON "Listing"(category, status)
WHERE status = 'PUBLISHED';

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_listing_price ON "Listing"(price_per_piece)
WHERE status = 'PUBLISHED';

-- Full-text search index on title and description
CREATE INDEX IF NOT EXISTS idx_listing_search ON "Listing" USING gin(to_tsvector('english', title || ' ' || description))
WHERE status = 'PUBLISHED';

-- Index for availability check
CREATE INDEX IF NOT EXISTS idx_listing_available ON "Listing"(quantity_available)
WHERE status = 'PUBLISHED' AND quantity_available > 0;

-- ============================================================================
-- RESERVATION INDEXES
-- ============================================================================

-- Composite index for buyer's reservations
CREATE INDEX IF NOT EXISTS idx_reservation_buyer_status_created ON "Reservation"(buyer_id, status, created_at DESC);

-- Composite index for seller's reservations (via listing)
CREATE INDEX IF NOT EXISTS idx_reservation_listing_status ON "Reservation"(listing_id, status);

-- Index for QR code lookups (critical for pickup flow)
CREATE INDEX IF NOT EXISTS idx_reservation_qr_code ON "Reservation"(qr_code_hash)
WHERE status IN ('CONFIRMED', 'PENDING');

-- Index for verification code lookups (manual verification fallback)
CREATE INDEX IF NOT EXISTS idx_reservation_verification_code ON "Reservation"(verification_code)
WHERE status IN ('CONFIRMED', 'PENDING');

-- Index for expired reservations cleanup
CREATE INDEX IF NOT EXISTS idx_reservation_expires_status ON "Reservation"(expires_at, status)
WHERE status = 'PENDING';

-- Index for Stripe payment intent lookups
CREATE INDEX IF NOT EXISTS idx_reservation_stripe_payment ON "Reservation"(stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

-- ============================================================================
-- USER INDEXES
-- ============================================================================

-- Index for email lookups (authentication)
CREATE INDEX IF NOT EXISTS idx_user_email_status ON "User"(email, account_status);

-- Index for phone lookups (authentication)
CREATE INDEX IF NOT EXISTS idx_user_phone_status ON "User"(phone, account_status);

-- Index for active users by type
CREATE INDEX IF NOT EXISTS idx_user_type_status ON "User"(user_type, account_status)
WHERE account_status = 'ACTIVE';

-- Index for user ratings (leaderboards/trust scores)
CREATE INDEX IF NOT EXISTS idx_user_rating ON "User"(rating_average DESC, rating_count DESC)
WHERE rating_count > 0;

-- ============================================================================
-- RATING INDEXES
-- ============================================================================

-- Composite index for fetching ratings by reservation
CREATE INDEX IF NOT EXISTS idx_rating_reservation_visible ON "Rating"(reservation_id, is_visible);

-- Index for user's received ratings
CREATE INDEX IF NOT EXISTS idx_rating_rated_visible ON "Rating"(rated_id, is_visible, created_at DESC)
WHERE is_visible = true;

-- Index for user's given ratings
CREATE INDEX IF NOT EXISTS idx_rating_rater ON "Rating"(rater_id, created_at DESC);

-- ============================================================================
-- MESSAGE INDEXES
-- ============================================================================

-- Composite index for conversation queries
CREATE INDEX IF NOT EXISTS idx_message_conversation_created ON "Message"(conversation_id, created_at DESC);

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_message_unread ON "Message"(recipient_id, is_read, created_at DESC)
WHERE is_read = false;

-- ============================================================================
-- NOTIFICATION INDEXES
-- ============================================================================

-- Composite index for user's notifications
CREATE INDEX IF NOT EXISTS idx_notification_user_created ON "Notification"(user_id, created_at DESC);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notification_unread ON "Notification"(user_id, is_read)
WHERE is_read = false;

-- ============================================================================
-- WEBHOOK DELIVERY INDEXES
-- ============================================================================

-- Index for pending retries (critical for webhook reliability)
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_retry ON "WebhookDelivery"(status, next_retry_at)
WHERE status = 'pending';

-- Index for webhook's delivery history
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_webhook_created ON "WebhookDelivery"(webhook_id, created_at DESC);

-- ============================================================================
-- SCHEDULED LISTING INDEXES
-- ============================================================================

-- Index for upcoming scheduled publications
CREATE INDEX IF NOT EXISTS idx_scheduled_listing_publish_time ON "ScheduledListing"(scheduled_publish_time, status)
WHERE status = 'scheduled';

-- Index for seller's scheduled listings
CREATE INDEX IF NOT EXISTS idx_scheduled_listing_seller ON "ScheduledListing"(seller_id, status, scheduled_publish_time);

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================

-- Update table statistics for query planner
ANALYZE "Listing";
ANALYZE "Reservation";
ANALYZE "User";
ANALYZE "Rating";
ANALYZE "Message";
ANALYZE "Notification";
ANALYZE "WebhookDelivery";
ANALYZE "ScheduledListing";

-- ============================================================================
-- VACUUM TABLES (optional, run during maintenance window)
-- ============================================================================

-- Uncomment to reclaim storage and update statistics
-- VACUUM ANALYZE "Listing";
-- VACUUM ANALYZE "Reservation";
-- VACUUM ANALYZE "User";

-- ============================================================================
-- NOTES
-- ============================================================================

/*
Performance Tips:
1. Run ANALYZE regularly (weekly) to keep query planner statistics up-to-date
2. Monitor slow queries with pg_stat_statements extension
3. Use EXPLAIN ANALYZE to understand query plans
4. Consider partitioning large tables (>10M rows) by created_at
5. Review index usage with pg_stat_user_indexes

Common Query Patterns:
- Geospatial search: Uses idx_listing_status_location with PostGIS ST_DWithin
- Seller dashboard: Uses idx_listing_seller_status_created
- Reservation lookup: Uses idx_reservation_qr_code or idx_reservation_verification_code
- User ratings: Uses idx_user_rating for trust scores

Monitoring:
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
*/
