/**
 * CMS Constants
 *
 * Static constants that don't require environment variables.
 * Separated from config.ts to allow importing without triggering env validation.
 */

// Valid page slugs for CMS content (route slugs)
export const CMS_SLUGS = [
  "privacy-policy",
  "terms-of-service",
  "about",
  "careers",
  "help",
  "safety",
  "fees",
  "contact",
  "cookies",
  "how-it-works",
] as const;

export type CMSSlug = (typeof CMS_SLUGS)[number];

// Supported locales for CMS content
export const CMS_LOCALES = ["en", "fr", "es"] as const;
export type CMSLocale = (typeof CMS_LOCALES)[number];

// Default locale when none is specified
export const DEFAULT_CMS_LOCALE: CMSLocale = "en";

/**
 * Check if a slug is valid
 */
export function isValidSlug(slug: string): slug is CMSSlug {
  return CMS_SLUGS.includes(slug as CMSSlug);
}

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string): locale is CMSLocale {
  return CMS_LOCALES.includes(locale as CMSLocale);
}
