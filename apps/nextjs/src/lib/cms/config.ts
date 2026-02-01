/**
 * CMS Configuration
 *
 * Centralizes all CMS-related settings and constants for the WordPress
 * headless CMS integration.
 *
 * Architecture:
 * - WordPress provides: Page title + HTML content
 * - App provides: SEO metadata (description, keywords) via seo.ts
 * - Slugs are translated per locale via slugs.ts
 *
 * @see constants.ts - Static constants (no env dependency)
 * @see slugs.ts - WordPress slug translations per language
 * @see seo.ts - SEO metadata configuration
 * @see client.ts - WordPress REST API client
 */

import { env } from "~/env";

import {
  CMS_LOCALES,
  CMS_SLUGS,
  DEFAULT_CMS_LOCALE,
  isValidLocale,
  isValidSlug,
} from "./constants";

// Re-export constants for backward compatibility
export {
  CMS_LOCALES,
  CMS_SLUGS,
  DEFAULT_CMS_LOCALE,
  isValidLocale,
  isValidSlug,
};
export type { CMSLocale, CMSSlug } from "./constants";

// CMS configuration object (requires env)
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
