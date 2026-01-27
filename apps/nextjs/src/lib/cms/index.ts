/**
 * CMS Module - Barrel Export
 * Provides headless CMS integration with WordPress REST API
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
  WPYoastMeta,
} from "./types";
export { isCMSError, isCMSSuccess } from "./types";
