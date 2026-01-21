"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";
import { locales, localeNames, type Locale } from "~/i18n";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Get current locale from pathname or default to 'en'
  const currentLocale = (locales.find((l) => pathname?.startsWith(`/${l}`)) ||
    "en") as Locale;

  const handleLanguageChange = (newLocale: Locale) => {
    setShowLanguageMenu(false);

    // Update the URL with the new locale
    let newPath = pathname || "/";

    // Check if the current path has a locale prefix
    const hasLocalePrefix = locales.some((l) => pathname?.startsWith(`/${l}`));

    if (hasLocalePrefix) {
      // Replace existing locale
      newPath = pathname?.replace(/^\/[a-z]{2}/, `/${newLocale}`) || `/${newLocale}`;
    } else {
      // Add locale prefix
      newPath = `/${newLocale}${pathname}`;
    }

    router.push(newPath);
  };

  const { data: session, isLoading } = api.auth.getSession.useQuery();
  const utils = api.useUtils();

  const isVerified = session?.user?.emailVerified === true;

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      // Invalidate the session query cache to immediately update the UI
      await utils.auth.getSession.invalidate();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/");
  };

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/vendgros-logo-light.png"
                alt="VendGros"
                width={250}
                height={71}
                priority
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link
              href="/listings/search"
              className={`text-md uppercase font-medium transition-colors ${
                isActive("/listings/search")
                  ? "text-green-600"
                  : "text-gray-700 hover:text-green-600"
              }`}
            >
              Browse
            </Link>

            <Link
              href="/listings/create"
              className={`text-md uppercase font-medium transition-colors ${
                isActive("/listings/create")
                  ? "text-green-600"
                  : "text-gray-700 hover:text-green-600"
              }`}
            >
              Sell
            </Link>
          </div>

          {/* Right side - Language & User Menu */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <svg
                  className="h-4 w-4"
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
                    className="fixed inset-0 z-10"
                    onClick={() => setShowLanguageMenu(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-36 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
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

            {isLoading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200"></div>
            ) : session?.user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 rounded-full bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  <span className="hidden sm:inline">
                    {session.user.email?.split("@")[0] || "User"}
                  </span>
                  <svg
                    className="h-4 w-4"
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

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                      <div className="border-b border-gray-100 px-4 py-2">
                        <p className="text-sm font-medium text-gray-900">
                          {session.user.name || "User"}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {session.user.email}
                        </p>
                      </div>

                      {isVerified && (
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Profile
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleSignOut();
                        }}
                        className="block w-full border-t border-gray-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/auth/signin"
                  className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden rounded-md p-2 text-gray-700 hover:bg-gray-100"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {showMobileMenu ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="border-t border-gray-200 md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            <Link
              href="/listings/search"
              className={`block rounded-md px-3 py-2 text-base font-medium ${
                isActive("/listings/search")
                  ? "bg-green-50 text-green-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              Browse
            </Link>

            <Link
              href="/listings/create"
              className={`block rounded-md px-3 py-2 text-base font-medium ${
                isActive("/listings/create")
                  ? "bg-green-50 text-green-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              Sell
            </Link>

            <Link
              href="/how-it-works"
              className={`block rounded-md px-3 py-2 text-base font-medium ${
                isActive("/how-it-works")
                  ? "bg-green-50 text-green-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              How it works
            </Link>

            {session?.user && isVerified && (
              <Link
                href="/profile"
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setShowMobileMenu(false)}
              >
                Profile
              </Link>
            )}

            {/* Mobile Language Switcher */}
            <div className="border-t border-gray-200 pt-2">
              <p className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                Language
              </p>
              <div className="flex flex-wrap gap-2 px-3 py-2">
                {locales.map((locale) => (
                  <button
                    key={locale}
                    onClick={() => {
                      handleLanguageChange(locale);
                      setShowMobileMenu(false);
                    }}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      locale === currentLocale
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {localeNames[locale]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
