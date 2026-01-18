-- Add isActive field to listing table
-- This allows sellers to temporarily deactivate their listings

ALTER TABLE listing
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Add comment
COMMENT ON COLUMN listing."isActive" IS 'Allows seller to temporarily deactivate listing without changing status';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_listing_is_active ON listing("isActive");

-- Update existing PUBLISHED listings to be active
UPDATE listing SET "isActive" = true WHERE status = 'PUBLISHED';
