import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

// Supported locales for the application
const locales = ["en", "fr", "es"] as const;
type Locale = (typeof locales)[number];

const defaultLocale: Locale = "en";

export default getRequestConfig(async () => {
  // Detect locale from cookie or Accept-Language header
  const cookieStore = await cookies();
  const headersList = await headers();

  // First check cookie
  const localeCookie = cookieStore.get("locale")?.value;
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return {
      locale: localeCookie,
      messages: (await import(`../messages/${localeCookie}.json`)).default,
    };
  }

  // Then check Accept-Language header
  const acceptLanguage = headersList.get("accept-language");
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(",")
      .map((lang) => lang.split(";")[0]?.trim().split("-")[0])
      .find((lang) => locales.includes(lang as Locale));

    if (preferredLocale) {
      return {
        locale: preferredLocale,
        messages: (await import(`../messages/${preferredLocale}.json`)).default,
      };
    }
  }

  // Default to English
  return {
    locale: defaultLocale,
    messages: (await import(`../messages/${defaultLocale}.json`)).default,
  };
});
