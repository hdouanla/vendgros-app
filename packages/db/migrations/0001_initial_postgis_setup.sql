-- ============================================================================
-- Vendgros Initial PostGIS Setup
-- ============================================================================
-- Run this AFTER `pnpm db:push` creates all tables via Drizzle
-- This sets up PostGIS-specific features that Drizzle cannot handle:
--   1. PostGIS extension
--   2. Trigger functions for auto-populating location POINT columns
--   3. Triggers on tables
--   4. GiST spatial indexes
--   5. Helper functions for proximity searches
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable PostGIS Extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- STEP 2: Create Trigger Functions
-- ============================================================================

-- Function to auto-populate location POINT from lat/lng on listings
CREATE OR REPLACE FUNCTION update_listing_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_AsText(ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-populate location POINT from lat/lng on postal_codes
CREATE OR REPLACE FUNCTION update_postal_code_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_AsText(ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Create Triggers
-- ============================================================================

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS listing_location_trigger ON listing;
DROP TRIGGER IF EXISTS postal_code_location_trigger ON postal_code;

-- Create trigger for listings
CREATE TRIGGER listing_location_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON listing
FOR EACH ROW
EXECUTE FUNCTION update_listing_location();

-- Create trigger for postal codes
CREATE TRIGGER postal_code_location_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON postal_code
FOR EACH ROW
EXECUTE FUNCTION update_postal_code_location();

-- ============================================================================
-- STEP 4: Create GiST Spatial Indexes
-- ============================================================================

-- Spatial index for listings (for proximity searches)
CREATE INDEX IF NOT EXISTS listing_location_gist_idx
ON listing USING GIST (ST_GeomFromText(location, 4326))
WHERE location IS NOT NULL;

-- Spatial index for postal codes
CREATE INDEX IF NOT EXISTS postal_code_location_gist_idx
ON postal_code USING GIST (ST_GeomFromText(location, 4326))
WHERE location IS NOT NULL;

-- ============================================================================
-- STEP 5: Create Helper Functions
-- ============================================================================

-- Function to find postal codes near a given point
CREATE OR REPLACE FUNCTION find_postal_codes_near_point(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  code VARCHAR,
  city VARCHAR,
  province VARCHAR,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.code,
    pc.city,
    pc.province,
    pc.latitude,
    pc.longitude,
    ST_Distance(
      ST_GeomFromText(pc.location, 4326)::geography,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
    ) / 1000 AS distance_km
  FROM postal_code pc
  WHERE pc.location IS NOT NULL
    AND ST_DWithin(
      ST_GeomFromText(pc.location, 4326)::geography,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to find listings near a given postal code
CREATE OR REPLACE FUNCTION find_listings_near_postal_code(
  search_postal_code VARCHAR,
  radius_km DOUBLE PRECISION DEFAULT 25
)
RETURNS TABLE (
  listing_id TEXT,
  title VARCHAR,
  price_per_piece DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
) AS $$
DECLARE
  postal_location TEXT;
BEGIN
  -- Get the location of the search postal code
  SELECT location INTO postal_location
  FROM postal_code
  WHERE code = search_postal_code;

  IF postal_location IS NULL THEN
    RAISE EXCEPTION 'Postal code % not found', search_postal_code;
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.price_per_piece,
    ST_Distance(
      ST_GeomFromText(l.location, 4326)::geography,
      ST_GeomFromText(postal_location, 4326)::geography
    ) / 1000 AS distance_km
  FROM listing l
  WHERE
    l.status = 'PUBLISHED'
    AND l.is_active = true
    AND l.location IS NOT NULL
    AND ST_DWithin(
      ST_GeomFromText(l.location, 4326)::geography,
      ST_GeomFromText(postal_location, 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to find listings near a given point (lat/lng)
CREATE OR REPLACE FUNCTION find_listings_near_point(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 25
)
RETURNS TABLE (
  listing_id TEXT,
  title VARCHAR,
  price_per_piece DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.price_per_piece,
    ST_Distance(
      ST_GeomFromText(l.location, 4326)::geography,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
    ) / 1000 AS distance_km
  FROM listing l
  WHERE
    l.status = 'PUBLISHED'
    AND l.is_active = true
    AND l.location IS NOT NULL
    AND ST_DWithin(
      ST_GeomFromText(l.location, 4326)::geography,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 6: Backfill existing data (if any)
-- ============================================================================

-- Update any listings that have lat/lng but no location
UPDATE listing
SET location = ST_AsText(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))
WHERE location IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- Update any postal codes that have lat/lng but no location
UPDATE postal_code
SET location = ST_AsText(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))
WHERE location IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- ============================================================================
-- DONE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'PostGIS setup complete!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - PostGIS extension';
  RAISE NOTICE '  - Trigger functions for auto-populating location';
  RAISE NOTICE '  - Triggers on listing and postal_code tables';
  RAISE NOTICE '  - GiST spatial indexes for fast proximity queries';
  RAISE NOTICE '  - Helper functions: find_postal_codes_near_point()';
  RAISE NOTICE '                      find_listings_near_postal_code()';
  RAISE NOTICE '                      find_listings_near_point()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Import postal codes: pnpm import-postal-codes';
  RAISE NOTICE '  2. Verify: SELECT COUNT(*) FROM postal_code;';
  RAISE NOTICE '  3. Test: SELECT * FROM find_postal_codes_near_point(43.65, -79.38, 10);';
  RAISE NOTICE '';
END $$;
