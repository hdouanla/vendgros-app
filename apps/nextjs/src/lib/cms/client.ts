/**
 * WordPress REST API Client
 * Fetches and transforms content from WordPress CMS
 */

import type { CMSLocale, CMSSlug } from "./config";
import {
  buildApiUrl,
  cmsConfig,
  isValidLocale,
  isValidSlug,
} from "./config";
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
 * Extract SEO metadata from WordPress page
 */
function extractSeoMeta(wpPage: WPPage, fallbackTitle: string): CMSSeoMeta {
  // Try Yoast SEO first
  if (wpPage.yoast_head_json) {
    const yoast = wpPage.yoast_head_json;
    return {
      title: yoast.title ?? fallbackTitle,
      description: yoast.description ?? stripHtml(wpPage.excerpt.rendered),
      canonical: yoast.canonical,
      ogTitle: yoast.og_title,
      ogDescription: yoast.og_description,
      ogImage: yoast.og_image?.[0]
        ? {
            url: yoast.og_image[0].url,
            width: yoast.og_image[0].width,
            height: yoast.og_image[0].height,
            type: yoast.og_image[0].type,
          }
        : undefined,
      twitterCard: yoast.twitter_card,
      twitterTitle: yoast.twitter_title,
      twitterDescription: yoast.twitter_description,
      twitterImage: yoast.twitter_image,
    };
  }

  // Try Rank Math SEO
  if (wpPage.rank_math_title || wpPage.rank_math_description) {
    return {
      title: wpPage.rank_math_title ?? fallbackTitle,
      description: wpPage.rank_math_description ?? stripHtml(wpPage.excerpt.rendered),
    };
  }

  // Fallback to basic page data
  return {
    title: `${fallbackTitle} - VendGros`,
    description: stripHtml(wpPage.excerpt.rendered) || `${fallbackTitle} page for VendGros marketplace.`,
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
    slug: routeSlug, // Use the route slug, not the WP slug
    title,
    content: wpPage.content.rendered,
    excerpt: stripHtml(wpPage.excerpt.rendered),
    lastModified: wpPage.modified_gmt,
    seo: extractSeoMeta(wpPage, title),
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
