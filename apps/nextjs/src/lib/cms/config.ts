/**
 * CMS Configuration
 * Centralizes all CMS-related settings and constants
 */

import { env } from "~/env";

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
] as const;

export type CMSSlug = (typeof CMS_SLUGS)[number];

// Supported locales for CMS content
export const CMS_LOCALES = ["en", "fr", "es"] as const;
export type CMSLocale = (typeof CMS_LOCALES)[number];

// Default locale when none is specified
export const DEFAULT_CMS_LOCALE: CMSLocale = "en";

// CMS configuration object
export const cmsConfig = {
  /** Base URL for WordPress CMS */
  baseUrl: env.NEXT_PUBLIC_CMS_URL,

  /** WordPress REST API path */
  apiPath: "/wp-json/wp/v2",

  /** ISR revalidation interval in seconds (default: 1 hour) */
  revalidateSeconds: env.NEXT_PUBLIC_CMS_REVALIDATE_SECONDS,

  /** Request timeout in milliseconds */
  timeoutMs: 10000,

  /** Valid page slugs */
  validSlugs: CMS_SLUGS,

  /** Supported locales */
  locales: CMS_LOCALES,

  /** Default locale */
  defaultLocale: DEFAULT_CMS_LOCALE,
} as const;

/**
 * Build the full API URL for WordPress REST API
 */
export function buildApiUrl(endpoint: string): string {
  const base = cmsConfig.baseUrl.replace(/\/$/, "");
  const path = cmsConfig.apiPath.replace(/\/$/, "");
  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}${clean}`;
}

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
