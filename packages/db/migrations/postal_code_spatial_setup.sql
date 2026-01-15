-- ============================================================================
-- Postal Code Spatial Setup
-- ============================================================================
-- This migration sets up PostGIS spatial indexing for Canadian postal codes
-- Prerequisites: PostGIS extension must be enabled (see 0000_enable_postgis.sql)
-- ============================================================================

-- 1. Create trigger to auto-populate location POINT from lat/lng
DROP TRIGGER IF EXISTS postal_code_location_trigger ON postal_code;

CREATE TRIGGER postal_code_location_trigger
BEFORE INSERT OR UPDATE ON postal_code
FOR EACH ROW
EXECUTE FUNCTION create_postal_code_spatial_index();

-- 2. Backfill existing postal codes (if any exist without location)
UPDATE postal_code
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::text
WHERE location IS NULL;

-- 3. Create GiST spatial index on location for fast proximity queries
-- Note: PostGIS converts text to geometry internally for spatial queries
CREATE INDEX IF NOT EXISTS postal_code_location_gist_idx
ON postal_code
USING GIST (ST_GeomFromText(location, 4326));

-- 4. Create additional indexes for common query patterns
CREATE INDEX IF NOT EXISTS postal_code_province_idx ON postal_code(province);
CREATE INDEX IF NOT EXISTS postal_code_city_idx ON postal_code(city);

-- 5. Add check constraint to ensure location format
ALTER TABLE postal_code
ADD CONSTRAINT IF NOT EXISTS postal_code_location_format_check
CHECK (location IS NULL OR location ~ '^POINT\(');

-- 6. Create helper function for postal code proximity search
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
  WHERE ST_DWithin(
    ST_GeomFromText(pc.location, 4326)::geography,
    ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
    radius_km * 1000 -- Convert km to meters
  )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7. Create helper function to find listings near a postal code
CREATE OR REPLACE FUNCTION find_listings_near_postal_code(
  search_postal_code VARCHAR,
  radius_km DOUBLE PRECISION DEFAULT 25
)
RETURNS TABLE (
  listing_id TEXT,
  title TEXT,
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
    AND ST_DWithin(
      ST_GeomFromText(l.location, 4326)::geography,
      ST_GeomFromText(postal_location, 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Grant appropriate permissions (adjust as needed)
-- GRANT SELECT ON postal_code TO public;
-- GRANT EXECUTE ON FUNCTION find_postal_codes_near_point TO public;
-- GRANT EXECUTE ON FUNCTION find_listings_near_postal_code TO public;

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '✅ Postal code spatial setup complete!';
  RAISE NOTICE '   - Trigger created for auto-populating POINT geometry';
  RAISE NOTICE '   - GiST spatial index created for fast proximity queries';
  RAISE NOTICE '   - Helper functions created for searching';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Run the postal code import: pnpm db:import-postal-codes';
  RAISE NOTICE '   2. Verify import: SELECT COUNT(*) FROM postal_code;';
  RAISE NOTICE '   3. Test proximity search: SELECT * FROM find_postal_codes_near_point(43.6532, -79.3832, 10);';
END $$;
