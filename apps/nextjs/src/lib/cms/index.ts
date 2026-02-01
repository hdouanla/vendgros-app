/**
 * CMS Module - Barrel Export
 *
 * Headless CMS integration with WordPress REST API.
 *
 * Architecture:
 * - WordPress provides: Page title + HTML content (no SEO plugins needed)
 * - App provides: SEO metadata (description, keywords) via seo.ts
 * - Multilanguage: Separate WP pages per language, slug mapping in slugs.ts
 *
 * Key exports:
 * - cmsClient: Fetches pages from WordPress
 * - seoConfig: App-side SEO metadata per page/locale
 * - slugTranslations: Route slug → WordPress slug per locale
 * - generateCMSMetadata: Creates Next.js Metadata from CMS data
 */

// Client
export { cmsClient, WordPressClient } from "./client";

// Configuration
export {
  buildApiUrl,
  CMS_LOCALES,
  CMS_SLUGS,
  cmsConfig,
  DEFAULT_CMS_LOCALE,
  isValidLocale,
  isValidSlug,
} from "./config";
export type { CMSLocale, CMSSlug } from "./config";

// Slug translations
export { getTranslatedSlug, slugTranslations } from "./slugs";

// SEO configuration (app-side)
export { getPageSeo, seoConfig } from "./seo";
export type { PageSeoConfig } from "./seo";

// Metadata utilities
export { generateCMSMetadata } from "./metadata";

// Types
export type {
  CMSError,
  CMSPage,
  CMSResult,
  CMSSeoMeta,
  CMSSuccess,
  WPFeaturedMedia,
  WPMediaDetails,
  WPPage,
  WPRendered,
} from "./types";
export { isCMSError, isCMSSuccess } from "./types";
