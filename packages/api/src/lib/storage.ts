/**
 * Storage URL utilities
 *
 * Handles conversion between relative storage paths and full URLs.
 * This allows the application to store relative paths in the database
 * while supporting easy switching of storage providers/domains.
 */

/**
 * Get the base URL for storage.
 * Uses DO_SPACES_URL environment variable.
 */
export function getStorageBaseUrl(): string {
  const baseUrl = process.env.DO_SPACES_URL;
  if (!baseUrl) {
    throw new Error("DO_SPACES_URL environment variable is not configured");
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
 * getStorageUrl("https://bucket.tor1.digitaloceanspaces.com/vendgros/dev/listings/abc/123.jpg")
 * // => "https://bucket.tor1.digitaloceanspaces.com/vendgros/dev/listings/abc/123.jpg"
 */
export function getStorageUrl(path: string): string {
  if (!path) return path;

  // If it's already a full URL, return as-is (backwards compatibility)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Remove leading slash if present
  const cleanPath = path.replace(/^\//, "");

  return `${getStorageBaseUrl()}/${cleanPath}`;
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

/**
 * Extract the relative path from a full storage URL.
 * Useful for converting legacy data or for delete operations.
 *
 * @param url - Full URL or relative path
 * @returns Relative path
 *
 * @example
 * getStoragePath("https://bucket.tor1.digitaloceanspaces.com/vendgros/dev/listings/abc/123.jpg")
 * // => "vendgros/dev/listings/abc/123.jpg"
 */
export function getStoragePath(url: string): string {
  if (!url) return url;

  // If it's already a relative path, return as-is
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return url.replace(/^\//, "");
  }

  try {
    const urlObj = new URL(url);
    // Remove leading slash from pathname
    return urlObj.pathname.replace(/^\//, "");
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Check if a path is a relative storage path (not a full URL).
 *
 * @param path - Path to check
 * @returns True if relative path, false if full URL
 */
export function isRelativePath(path: string): boolean {
  return !path.startsWith("http://") && !path.startsWith("https://");
}
