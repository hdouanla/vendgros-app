// Locale configuration - can be used in both client and server components

// Supported locales for the application
export const locales = ["en", "fr", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Locale display names
export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
};
