/**
 * Geocoding Service
 * Converts addresses to coordinates using Mapbox Geocoding API
 */

interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
}

interface MapboxFeature {
  center: [number, number]; // [longitude, latitude]
  place_name: string;
  context?: Array<{
    id: string;
    text: string;
  }>;
}

interface MapboxResponse {
  features: MapboxFeature[];
}

/**
 * Geocode an address using Mapbox Geocoding API
 * @param address - Full address string
 * @param countryCode - Optional country code to bias results (CA, US, etc.)
 * @returns Geocoding result with coordinates and formatted address
 */
export async function geocodeAddress(
  address: string,
  countryCode?: string,
): Promise<GeocodingResult> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken) {
    console.error("NEXT_PUBLIC_MAPBOX_TOKEN not configured");
    // Fallback to Toronto coordinates
    return {
      latitude: 43.6532,
      longitude: -79.3832,
      formattedAddress: address,
      city: "Toronto",
      province: "ON",
      country: "Canada",
    };
  }

  try {
    // URL encode the address
    const encodedAddress = encodeURIComponent(address);

    // Build Mapbox URL with optional country biasing
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1`;

    if (countryCode) {
      url += `&country=${countryCode}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = (await response.json()) as MapboxResponse;

    if (!data.features || data.features.length === 0) {
      throw new Error("No geocoding results found");
    }

    const feature = data.features[0]!;
    const [longitude, latitude] = feature.center;

    // Extract address components from context
    const context = feature.context ?? [];
    const city = context.find((c) => c.id.startsWith("place"))?.text;
    const province = context.find((c) => c.id.startsWith("region"))?.text;
    const country = context.find((c) => c.id.startsWith("country"))?.text;
    const postalCode = context.find((c) => c.id.startsWith("postcode"))?.text;

    return {
      latitude,
      longitude,
      formattedAddress: feature.place_name,
      city,
      province,
      country,
      postalCode,
    };
  } catch (error) {
    console.error("Geocoding error:", error);

    // Fallback to Toronto coordinates
    return {
      latitude: 43.6532,
      longitude: -79.3832,
      formattedAddress: address,
    };
  }
}

/**
 * Reverse geocode coordinates to an address
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @returns Address string
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken) {
    console.error("NEXT_PUBLIC_MAPBOX_TOKEN not configured");
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = (await response.json()) as MapboxResponse;

    if (!data.features || data.features.length === 0) {
      throw new Error("No reverse geocoding results found");
    }

    return data.features[0]!.place_name;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}

/**
 * Validate and normalize a Canadian postal code
 * @param postalCode - Postal code (e.g., "M5H2N2" or "M5H 2N2")
 * @returns Normalized postal code (e.g., "M5H 2N2") or null if invalid
 */
export function normalizePostalCode(postalCode: string): string | null {
  // Remove whitespace and convert to uppercase
  const cleaned = postalCode.replace(/\s+/g, "").toUpperCase();

  // Canadian postal code regex: A1A1A1
  const regex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;

  if (!regex.test(cleaned)) {
    return null;
  }

  // Format as "A1A 1A1"
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
}

/**
 * Get coordinates from a Canadian postal code using the database
 * @param postalCode - Canadian postal code (e.g., "M5H 2N2")
 * @param db - Drizzle database instance
 * @returns Coordinates or null if not found
 */
export async function getPostalCodeCoordinates(
  postalCode: string,
  db: any,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const normalized = normalizePostalCode(postalCode);
    if (!normalized) {
      return null;
    }

    const result = await db.query.postalCode.findFirst({
      where: (postalCodes: any, { eq }: any) =>
        eq(postalCodes.code, normalized),
    });

    if (!result) {
      return null;
    }

    return {
      latitude: result.latitude,
      longitude: result.longitude,
    };
  } catch (error) {
    console.error("Postal code lookup error:", error);
    return null;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - Latitude of point 1
 * @param lon1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lon2 - Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
