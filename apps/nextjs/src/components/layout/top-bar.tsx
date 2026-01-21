"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "~/i18n";

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Get current locale from pathname or default to 'en'
  const currentLocale = (locales.find(l => pathname?.startsWith(`/${l}`)) || "en") as Locale;

  const handleLanguageChange = (newLocale: Locale) => {
    setShowLanguageMenu(false);

    // Update the URL with the new locale
    let newPath = pathname || "/";

    // Check if the current path has a locale prefix
    const hasLocalePrefix = locales.some(l => pathname?.startsWith(`/${l}`));

    if (hasLocalePrefix) {
      // Replace existing locale
      newPath = pathname?.replace(/^\/[a-z]{2}/, `/${newLocale}`) || `/${newLocale}`;
    } else {
      // Add locale prefix
      newPath = `/${newLocale}${pathname}`;
    }

    router.push(newPath);
  };

  return (
    <div className="bg-[#0B1D14] text-white">
      <div className="mx-auto flex h-12 max-w-content items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Helpdesk */}
        <a
          href="/help"
          className="flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors hover:text-white"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="hidden sm:inline">Help Center</span>
          <span className="sm:hidden">Help</span>
        </a>

        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
            <span>{localeNames[currentLocale]}</span>
            <svg
              className={`h-3 w-3 transition-transform ${showLanguageMenu ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Language Dropdown */}
          {showLanguageMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowLanguageMenu(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-36 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                {locales.map((locale) => (
                  <button
                    key={locale}
                    onClick={() => handleLanguageChange(locale)}
                    className={`block w-full px-4 py-2 text-left text-sm ${
                      locale === currentLocale
                        ? "bg-green-50 font-medium text-green-600"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {localeNames[locale]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
