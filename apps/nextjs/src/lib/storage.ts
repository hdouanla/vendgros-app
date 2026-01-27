/**
 * Client-side storage URL utilities
 *
 * Handles conversion between relative storage paths and full URLs.
 * Uses NEXT_PUBLIC_STORAGE_URL environment variable for client-side access.
 */

/**
 * Get the base URL for storage.
 * Uses NEXT_PUBLIC_STORAGE_URL for client-side access,
 * falls back to DO_SPACES_URL for server-side.
 */
export function getStorageBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_STORAGE_URL || process.env.DO_SPACES_URL;

  if (!baseUrl) {
    console.warn(
      "Storage URL not configured. Set NEXT_PUBLIC_STORAGE_URL or DO_SPACES_URL."
    );
    return "";
  }
  // Remove trailing slash if present
  return baseUrl.replace(/\/$/, "");
}

/**
 * Convert a relative storage path to a full URL.
 * Handles both relative paths and legacy full URLs (for backwards compatibility).
 *
 * @param path - Relative path (e.g., "vendgros/dev/listings/user-id/file.jpg")
 *               or legacy full URL
 * @returns Full URL to the resource
 *
 * @example
 * // Relative path
 * getStorageUrl("vendgros/dev/listings/abc/123.jpg")
 * // => "https://bucket.tor1.digitaloceanspaces.com/vendgros/dev/listings/abc/123.jpg"
 *
 * // Legacy full URL (returned as-is)
 * getStorageUrl("https://bucket.tor1.digitaloceanspaces.com/...")
 * // => "https://bucket.tor1.digitaloceanspaces.com/..."
 */
export function getStorageUrl(path: string): string {
  if (!path) return path;

  // If it's already a full URL, return as-is (backwards compatibility)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl = getStorageBaseUrl();
  if (!baseUrl) {
    // Fallback: return path as-is if no base URL configured
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.replace(/^\//, "");

  return `${baseUrl}/${cleanPath}`;
}

/**
 * Convert an array of relative storage paths to full URLs.
 * Useful for listing photos array.
 *
 * @param paths - Array of relative paths or legacy full URLs
 * @returns Array of full URLs
 */
export function getStorageUrls(paths: string[]): string[] {
  return paths.map(getStorageUrl);
}
