-- Migration: Separate buyer and seller ratings
-- This migration adds support for:
-- 1. isAdmin boolean flag (replacing userType === "ADMIN" check)
-- 2. Separate buyer/seller rating averages and counts
-- 3. Rating type enum to categorize ratings by role

-- ============================================================================
-- STEP 1: Create rating_type enum
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE rating_type AS ENUM ('AS_BUYER', 'AS_SELLER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Add new columns to user table
-- ============================================================================

-- Add isAdmin boolean (replaces userType === "ADMIN" check)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Add separate buyer/seller rating fields
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS buyer_rating_average DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS buyer_rating_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS seller_rating_average DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS seller_rating_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- STEP 3: Add rating_type column to rating table
-- ============================================================================

-- Add rating_type column (nullable initially for migration)
ALTER TABLE "rating" ADD COLUMN IF NOT EXISTS rating_type rating_type;

-- ============================================================================
-- STEP 4: Migrate existing data
-- ============================================================================

-- Set isAdmin = true for users with userType = 'ADMIN'
UPDATE "user" SET is_admin = true WHERE user_type = 'ADMIN';

-- Migrate existing ratings to have a rating_type based on the transaction context
-- If the rater is the buyer (buyerId), they rated the seller (AS_SELLER)
-- If the rater is the seller, they rated the buyer (AS_BUYER)
UPDATE "rating" r
SET rating_type = CASE
  WHEN r.rater_id = res.buyer_id THEN 'AS_SELLER'::rating_type
  ELSE 'AS_BUYER'::rating_type
END
FROM "reservation" res
WHERE r.reservation_id = res.id
  AND r.rating_type IS NULL;

-- ============================================================================
-- STEP 5: Make rating_type NOT NULL after migration
-- ============================================================================

-- Set default for any remaining NULL values (shouldn't be any, but just in case)
UPDATE "rating" SET rating_type = 'AS_SELLER' WHERE rating_type IS NULL;

-- Now make it NOT NULL
ALTER TABLE "rating" ALTER COLUMN rating_type SET NOT NULL;

-- ============================================================================
-- STEP 6: Create index for efficient queries by rating type
-- ============================================================================

CREATE INDEX IF NOT EXISTS rating_rated_type_idx ON "rating" (rated_id, rating_type);

-- ============================================================================
-- STEP 7: Recalculate all user rating statistics
-- ============================================================================

-- This updates both overall and separate buyer/seller ratings for all users
-- Note: This uses the same logic as the application, filtering only visible ratings
-- (where both parties have rated)

-- Update seller ratings
WITH seller_stats AS (
  SELECT
    r.rated_id,
    COUNT(*) as count,
    AVG(r.score) as avg
  FROM "rating" r
  WHERE r.rating_type = 'AS_SELLER'
    AND EXISTS (
      SELECT 1 FROM "rating" r2
      WHERE r2.reservation_id = r.reservation_id
        AND r2.rater_id = r.rated_id
    )
  GROUP BY r.rated_id
)
UPDATE "user" u
SET
  seller_rating_count = COALESCE(s.count, 0),
  seller_rating_average = ROUND(COALESCE(s.avg, 0)::numeric, 2)
FROM seller_stats s
WHERE u.id = s.rated_id;

-- Update buyer ratings
WITH buyer_stats AS (
  SELECT
    r.rated_id,
    COUNT(*) as count,
    AVG(r.score) as avg
  FROM "rating" r
  WHERE r.rating_type = 'AS_BUYER'
    AND EXISTS (
      SELECT 1 FROM "rating" r2
      WHERE r2.reservation_id = r.reservation_id
        AND r2.rater_id = r.rated_id
    )
  GROUP BY r.rated_id
)
UPDATE "user" u
SET
  buyer_rating_count = COALESCE(b.count, 0),
  buyer_rating_average = ROUND(COALESCE(b.avg, 0)::numeric, 2)
FROM buyer_stats b
WHERE u.id = b.rated_id;

-- ============================================================================
-- DONE
-- ============================================================================
