/**
 * CMS Slug Translations
 * Maps route slugs to WordPress page slugs for each language
 *
 * The URL stays the same (e.g., /privacy-policy) but the WordPress
 * page slug changes based on the user's selected language.
 */

import type { CMSLocale, CMSSlug } from "./config";

/**
 * Mapping of route slugs to translated WordPress page slugs
 * Key: route slug (used in Next.js routes)
 * Value: object with WordPress page slug for each language
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
    en: "contact",
    fr: "contact",
    es: "contacto",
  },
  cookies: {
    en: "cookies",
    fr: "cookies",
    es: "cookies",
  },
};

/**
 * Get the WordPress page slug for a given route slug and locale
 */
export function getTranslatedSlug(routeSlug: CMSSlug, locale: CMSLocale): string {
  const translations = slugTranslations[routeSlug];
  return translations[locale] ?? translations.en;
}
