-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create spatial index function for listings
CREATE OR REPLACE FUNCTION create_listing_spatial_index()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create spatial index function for postal codes
CREATE OR REPLACE FUNCTION create_postal_code_spatial_index()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Triggers will be created after table creation in the next migration
