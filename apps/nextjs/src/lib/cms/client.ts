/**
 * WordPress REST API Client
 *
 * Fetches and transforms page content from WordPress headless CMS.
 *
 * Data sources:
 * - Title: WordPress page title
 * - Content: WordPress page content (HTML)
 * - SEO (description, keywords): App-side config (seo.ts)
 * - WordPress slug: Translated per locale (slugs.ts)
 *
 * Flow:
 * 1. Route slug (e.g., "about") → WordPress slug (e.g., "a-propos" for FR)
 * 2. Fetch from WordPress REST API
 * 3. Combine WP title/content with app-side SEO
 * 4. Return CMSPage object
 *
 * No WordPress SEO plugins required - all SEO is managed in seo.ts
 *
 * @see seo.ts - SEO metadata configuration
 * @see slugs.ts - Slug translations per locale
 */

import type { CMSLocale, CMSSlug } from "./config";
import {
  buildApiUrl,
  cmsConfig,
  isValidLocale,
  isValidSlug,
} from "./config";
import { getPageSeo } from "./seo";
import { getTranslatedSlug } from "./slugs";
import type {
  CMSError,
  CMSPage,
  CMSResult,
  CMSSeoMeta,
  WPPage,
} from "./types";

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Build SEO metadata
 * Title comes from WordPress, description & keywords from app-side config
 */
function buildSeoMeta(
  wpTitle: string,
  routeSlug: CMSSlug,
  locale: CMSLocale
): CMSSeoMeta {
  const seoConfig = getPageSeo(routeSlug, locale);
  const title = `${wpTitle} - VendGros`;

  return {
    title,
    description: seoConfig.description,
    keywords: seoConfig.keywords,
    ogTitle: title,
    ogDescription: seoConfig.description,
    ogImage: seoConfig.ogImage
      ? { url: seoConfig.ogImage, width: 1200, height: 630 }
      : undefined,
    twitterCard: "summary_large_image",
    twitterTitle: title,
    twitterDescription: seoConfig.description,
    twitterImage: seoConfig.ogImage,
  };
}

/**
 * Transform WordPress page response to CMSPage
 */
function transformWPPage(wpPage: WPPage, locale: CMSLocale, routeSlug: CMSSlug): CMSPage {
  const title = stripHtml(wpPage.title.rendered);
  const featuredMedia = wpPage._embedded?.["wp:featuredmedia"]?.[0];

  return {
    id: wpPage.id,
    slug: routeSlug,
    title,
    content: wpPage.content.rendered,
    excerpt: stripHtml(wpPage.excerpt.rendered),
    lastModified: wpPage.modified_gmt,
    seo: buildSeoMeta(title, routeSlug, locale), // Title from WP, rest from app config
    locale,
    featuredImage: featuredMedia
      ? {
          url: featuredMedia.source_url,
          alt: featuredMedia.alt_text || title,
          width: featuredMedia.media_details.width,
          height: featuredMedia.media_details.height,
        }
      : undefined,
  };
}

/**
 * Create an error result
 */
function createError(
  code: CMSError["error"]["code"],
  message: string,
  details?: unknown
): CMSError {
  return {
    success: false,
    error: { code, message, details },
  };
}

/**
 * WordPress CMS client for fetching page content
 *
 * Uses slug translation to fetch the correct language version:
 * - Route slug stays the same (e.g., /privacy-policy)
 * - WordPress slug changes per language (e.g., politique-de-confidentialite for FR)
 */
class WordPressClient {
  /**
   * Fetch a page by route slug and locale
   * @param routeSlug - The URL route slug (e.g., "privacy-policy")
   * @param locale - The user's current locale (e.g., "fr")
   */
  async getPageBySlug(
    routeSlug: string,
    locale: string
  ): Promise<CMSResult<CMSPage>> {
    // Validate route slug
    if (!isValidSlug(routeSlug)) {
      return createError("INVALID_SLUG", `Invalid page slug: ${routeSlug}`);
    }

    // Validate and normalize locale
    const normalizedLocale = isValidLocale(locale) ? locale : cmsConfig.defaultLocale;

    // Get the translated WordPress slug for this locale
    const wpSlug = getTranslatedSlug(routeSlug, normalizedLocale);

    // Build the API URL with query parameters (no lang param needed)
    const params = new URLSearchParams({
      slug: wpSlug,
      _embed: "wp:featuredmedia", // Include featured image in response
    });

    const url = buildApiUrl(`/pages?${params.toString()}`);

    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cmsConfig.timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        next: {
          revalidate: cmsConfig.revalidateSeconds,
        },
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return createError(
            "NOT_FOUND",
            `Page not found: ${wpSlug} (${normalizedLocale})`
          );
        }
        return createError(
          "NETWORK_ERROR",
          `WordPress API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as WPPage[];

      // WordPress returns an array, get first matching page
      if (!Array.isArray(data) || data.length === 0) {
        return createError(
          "NOT_FOUND",
          `Page not found: ${wpSlug} (${normalizedLocale})`
        );
      }

      const wpPage = data[0];
      if (!wpPage) {
        return createError(
          "NOT_FOUND",
          `Page not found: ${wpSlug} (${normalizedLocale})`
        );
      }

      // Validate response has required fields
      if (!wpPage.id || !wpPage.title.rendered || !wpPage.content.rendered) {
        return createError(
          "INVALID_RESPONSE",
          "WordPress page response missing required fields"
        );
      }

      const page = transformWPPage(wpPage, normalizedLocale, routeSlug);

      return {
        success: true,
        data: page,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return createError(
            "TIMEOUT",
            `Request timed out after ${cmsConfig.timeoutMs}ms`
          );
        }
        return createError("NETWORK_ERROR", error.message, error);
      }
      return createError("UNKNOWN_ERROR", "An unknown error occurred", error);
    }
  }

  /**
   * Get multiple pages by slugs (for preloading or sitemap)
   */
  async getPagesBySlugs(
    slugs: CMSSlug[],
    locale: CMSLocale
  ): Promise<CMSResult<CMSPage>[]> {
    return Promise.all(slugs.map((slug) => this.getPageBySlug(slug, locale)));
  }

  /**
   * Check if CMS is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(buildApiUrl("/"), {
        signal: controller.signal,
        method: "HEAD",
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export a singleton instance
export const cmsClient = new WordPressClient();

// Also export the class for testing
export { WordPressClient };
