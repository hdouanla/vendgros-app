import createMiddleware from "next-intl/middleware";

import { defaultLocale, locales } from "./i18n";

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Don't use locale prefixes for the default locale
  localePrefix: "as-needed",
});

export const config = {
  // Match only internationalized pathnames
  matcher: ["/", "/(fr|es)/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
};
