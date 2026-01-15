import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./translations/en.json";
import es from "./translations/es.json";
import fr from "./translations/fr.json";

// Supported locales
export const locales = ["en", "fr", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Locale display names
export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
};

// i18n configuration
i18n.use(initReactI18next).init({
  compatibilityJSON: "v3", // For compatibility with older versions
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    es: { translation: es },
  },
  lng: defaultLocale,
  fallbackLng: defaultLocale,
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;
