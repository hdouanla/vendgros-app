/**
 * CMS Metadata Utilities
 *
 * Helper functions for generating Next.js Metadata objects from CMS data.
 * Used in page.tsx files via generateMetadata() export.
 *
 * Data sources:
 * - Title: WordPress page title (via CMSPage.seo.title)
 * - Description: App-side config (seo.ts)
 * - Keywords: App-side config (seo.ts)
 *
 * Usage in page.tsx:
 * ```ts
 * export async function generateMetadata(): Promise<Metadata> {
 *   const result = await cmsClient.getPageBySlug("about", locale);
 *   return generateCMSMetadata(result, { fallbackTitle, fallbackDescription });
 * }
 * ```
 *
 * @see seo.ts - SEO metadata source
 * @see client.ts - Fetches CMSPage with SEO data
 */

import type { Metadata } from "next";

import type { CMSPage, CMSResult } from "./types";
import { isCMSSuccess } from "./types";

interface MetadataFallback {
  fallbackTitle: string;
  fallbackDescription: string;
}

/**
 * Generate Next.js Metadata object from CMS result
 * SEO data comes from app-side config (seo.ts)
 */
export function generateCMSMetadata(
  result: CMSResult<CMSPage>,
  fallback: MetadataFallback
): Metadata {
  if (!isCMSSuccess(result)) {
    return {
      title: fallback.fallbackTitle,
      description: fallback.fallbackDescription,
    };
  }

  const { seo } = result.data;

  return {
    // Core SEO
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,

    // Open Graph
    openGraph: {
      type: "website",
      siteName: "VendGros",
      title: seo.ogTitle ?? seo.title,
      description: seo.ogDescription ?? seo.description,
      images: seo.ogImage
        ? [
            {
              url: seo.ogImage.url,
              width: seo.ogImage.width,
              height: seo.ogImage.height,
            },
          ]
        : undefined,
    },

    // Twitter Cards
    twitter: {
      card: seo.twitterCard ?? "summary_large_image",
      title: seo.twitterTitle ?? seo.title,
      description: seo.twitterDescription ?? seo.description,
      images: seo.twitterImage ? [seo.twitterImage] : undefined,
    },
  };
}
