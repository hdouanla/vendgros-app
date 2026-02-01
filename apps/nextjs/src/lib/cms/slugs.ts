/**
 * CMS Slug Translations
 *
 * Maps Next.js route slugs to WordPress page slugs for each language.
 * This enables multilanguage support without WordPress plugins (WPML, Polylang).
 *
 * How it works:
 * - URL stays the same for all languages (e.g., /privacy-policy)
 * - WordPress page slug changes per locale (e.g., "politique-de-confidentialite" for FR)
 * - Each language has separate WordPress pages with translated slugs
 *
 * CONSTRAINT: WordPress slugs must be UNIQUE within each language.
 * The module validates this at load time and throws an error if duplicates exist.
 *
 * To add a new page:
 * 1. Add route slug to config.ts → CMS_SLUGS
 * 2. Add translations here (unique slug per language)
 * 3. Add SEO config in seo.ts
 * 4. Create WordPress pages with matching slugs
 *
 * @see config.ts - Valid route slugs
 * @see seo.ts - SEO metadata per page/locale
 */

import type { CMSLocale, CMSSlug } from "./constants";

/**
 * Mapping of route slugs to translated WordPress page slugs
 * Key: route slug (used in Next.js routes)
 * Value: object with WordPress page slug for each language
 *
 * CONSTRAINT: All WordPress slugs must be unique per language
 */
export const slugTranslations: Record<CMSSlug, Record<CMSLocale, string>> = {
  "privacy-policy": {
    en: "privacy-policy",
    fr: "politique-de-confidentialite",
    es: "politica-de-privacidad",
  },
  "terms-of-service": {
    en: "terms-of-service",
    fr: "conditions-dutilisation",
    es: "terminos-de-servicio",
  },
  about: {
    en: "about",
    fr: "a-propos",
    es: "sobre-nosotros",
  },
  careers: {
    en: "careers",
    fr: "carrieres",
    es: "empleo",
  },
  help: {
    en: "help",
    fr: "aide",
    es: "ayuda",
  },
  safety: {
    en: "safety",
    fr: "securite",
    es: "seguridad",
  },
  fees: {
    en: "fees",
    fr: "frais",
    es: "tarifas",
  },
  contact: {
    en: "contact-us",
    fr: "nous-contacter",
    es: "contactenos",
  },
  cookies: {
    en: "cookie-policy",
    fr: "politique-cookies",
    es: "politica-cookies",
  },
  "how-it-works": {
    en: "how-it-works",
    fr: "comment-ca-fonctionne",
    es: "como-funciona",
  },
};

/**
 * Validate that all WordPress slugs are unique per language
 * Throws an error if duplicates are found
 */
function validateUniqueSlags(): void {
  const locales: CMSLocale[] = ["en", "fr", "es"];

  for (const locale of locales) {
    const slugs = new Map<string, string>();

    for (const [routeSlug, translations] of Object.entries(slugTranslations)) {
      const wpSlug = translations[locale];

      if (slugs.has(wpSlug)) {
        throw new Error(
          `Duplicate WordPress slug "${wpSlug}" for locale "${locale}". ` +
            `Routes "${slugs.get(wpSlug)}" and "${routeSlug}" cannot share the same slug.`
        );
      }

      slugs.set(wpSlug, routeSlug);
    }
  }
}

// Validate on module load (will throw at build time if duplicates exist)
validateUniqueSlags();

/**
 * Get the WordPress page slug for a given route slug and locale
 */
export function getTranslatedSlug(routeSlug: CMSSlug, locale: CMSLocale): string {
  const translations = slugTranslations[routeSlug];
  return translations[locale] ?? translations.en;
}
