/**
 * CMS Type Definitions
 *
 * TypeScript interfaces for WordPress REST API responses and internal types.
 *
 * Architecture:
 * - WP* types: Raw WordPress REST API response structures
 * - CMS* types: Processed/transformed types used in the app
 *
 * Data flow:
 * 1. WordPress REST API returns WPPage
 * 2. client.ts transforms to CMSPage (title from WP, SEO from seo.ts)
 * 3. Pages use CMSPage for rendering and metadata
 *
 * @see client.ts - Transformation logic
 * @see seo.ts - SEO metadata source
 */

import type { CMSLocale, CMSSlug } from "./config";

// =============================================================================
// WordPress REST API Types
// =============================================================================

/**
 * WordPress rendered content object
 */
export interface WPRendered {
  rendered: string;
  protected?: boolean;
}

/**
 * WordPress media/image details
 */
export interface WPMediaDetails {
  width: number;
  height: number;
  file: string;
  sizes: Record<
    string,
    {
      file: string;
      width: number;
      height: number;
      mime_type: string;
      source_url: string;
    }
  >;
}

/**
 * WordPress featured media (image)
 */
export interface WPFeaturedMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: WPMediaDetails;
}

/**
 * Raw WordPress page response from REST API
 * SEO metadata is managed app-side (see seo.ts), not from WordPress plugins
 */
export interface WPPage {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: "publish" | "draft" | "pending" | "private" | "future" | "trash";
  type: string;
  link: string;
  title: WPRendered;
  content: WPRendered;
  excerpt: WPRendered;
  featured_media: number;
  template: string;
  // Featured media embedding
  _embedded?: {
    "wp:featuredmedia"?: WPFeaturedMedia[];
  };
}

// =============================================================================
// Internal CMS Types
// =============================================================================

/**
 * SEO metadata (managed app-side in seo.ts)
 */
export interface CMSSeoMeta {
  // Core SEO
  title: string;
  description: string;
  keywords?: string[];
  // Open Graph
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: {
    url: string;
    width: number;
    height: number;
  };
  // Twitter Cards
  twitterCard?: "summary" | "summary_large_image";
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
}

/**
 * Processed CMS page data
 */
export interface CMSPage {
  /** WordPress page ID */
  id: number;
  /** Page slug (URL-friendly identifier) */
  slug: CMSSlug;
  /** Page title (plain text, HTML stripped) */
  title: string;
  /** Page content (HTML from WordPress) */
  content: string;
  /** Short excerpt (HTML stripped) */
  excerpt: string;
  /** Last modification date (ISO string) */
  lastModified: string;
  /** SEO metadata */
  seo: CMSSeoMeta;
  /** Locale of this content */
  locale: CMSLocale;
  /** Featured image URL if available */
  featuredImage?: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Success result from CMS operations
 */
export interface CMSSuccess<T> {
  success: true;
  data: T;
}

/**
 * Error result from CMS operations
 */
export interface CMSError {
  success: false;
  error: {
    code: CMSErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * Union type for CMS operation results
 */
export type CMSResult<T> = CMSSuccess<T> | CMSError;

/**
 * Error codes for CMS operations
 */
export type CMSErrorCode =
  | "NOT_FOUND"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "PARSE_ERROR"
  | "INVALID_RESPONSE"
  | "INVALID_SLUG"
  | "INVALID_LOCALE"
  | "UNKNOWN_ERROR";

// =============================================================================
// Helper Type Guards
// =============================================================================

/**
 * Type guard to check if result is successful
 */
export function isCMSSuccess<T>(result: CMSResult<T>): result is CMSSuccess<T> {
  return result.success === true;
}

/**
 * Type guard to check if result is an error
 */
export function isCMSError<T>(result: CMSResult<T>): result is CMSError {
  return result.success === false;
}
