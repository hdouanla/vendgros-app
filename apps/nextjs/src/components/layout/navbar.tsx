"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { api } from "~/trpc/react";
import { locales, localeNames, type Locale } from "~/i18n";
import { PendingPaymentAlert } from "~/components/reservations/pending-payment-alert";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const locale = useLocale();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [currentLocale, setCurrentLocale] = useState<Locale>(locale as Locale);

  // Sync currentLocale with the actual locale from next-intl
  useEffect(() => {
    setCurrentLocale(locale as Locale);
  }, [locale]);

  const handleLanguageChange = (newLocale: Locale) => {
    setShowLanguageMenu(false);

    // Set locale cookie and refresh the page
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`; // 1 year
    router.refresh();
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
      <div className="mx-auto max-w-content px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          {/* Logo and Desktop Navigation - Left Aligned */}
          <div className="flex items-center gap-[96px]">
            <Link href="/" className="flex items-center">
              {/* Mobile: Icon */}
              <Image
                src="/vendgros-icon-web.png"
                alt="VendGros"
                width={48}
                height={48}
                priority
                className="md:hidden"
              />
              {/* Desktop: Full logo */}
              <Image
                src="/vendgros-logo-web-light.png"
                alt="VendGros"
                width={220}
                height={46}
                priority
                className="hidden md:block"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link
                href="/listings/search"
                className={`text-md flex items-center gap-1.5 font-medium transition-colors ${
                  isActive("/listings/search")
                    ? "text-green-600"
                    : "text-gray-700 hover:text-green-600"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {t("browse")}
              </Link>

              <Link
                href="/listings/create"
                className={`text-md flex items-center gap-1.5 font-medium transition-colors ${
                  isActive("/listings/create")
                    ? "text-green-600"
                    : "text-gray-700 hover:text-green-600"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {t("sell")}
              </Link>
            </div>
          </div>

          {/* Right side - Language & User Menu */}
          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-md font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
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
                <span className='text-md font-medium'>{localeNames[currentLocale]}</span>
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
                  <div className="absolute right-0 z-20 mt-2 w-36 overflow-hidden rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
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
              <>
                {/* Pending Payment Alert */}
                <PendingPaymentAlert />

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
                    <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                      <div className="border-b border-gray-100 px-4 py-2">
                        <p className="text-sm font-medium text-gray-900">
                          {session.user.name || "User"}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {session.user.email}
                        </p>
                      </div>

                      {isVerified && (
                        <>
                          <Link
                            href="/profile"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {t("profile")}
                          </Link>
                          <Link
                            href="/profile/favorites"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            {t("myFavorites")}
                          </Link>
                          <Link
                            href="/profile/likes"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {t("myLikes")}
                          </Link>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleSignOut();
                        }}
                        className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t("signOut")}
                      </button>
                    </div>
                  </>
                )}
              </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/auth/signin"
                  className="rounded-md px-4 py-2 font-medium text-md text-gray-700 hover:bg-gray-100"
                >
                  {t("signIn")}
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-md bg-green-600 px-4 py-2 text-md font-medium text-white hover:bg-green-700"
                >
                  {t("signUp")}
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
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium ${
                isActive("/listings/search")
                  ? "bg-green-50 text-green-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t("browse")}
            </Link>

            <Link
              href="/listings/create"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium ${
                isActive("/listings/create")
                  ? "bg-green-50 text-green-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setShowMobileMenu(false)}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {t("sell")}
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
              {t("howItWorks")}
            </Link>

            {session?.user && isVerified && (
              <Link
                href="/profile"
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setShowMobileMenu(false)}
              >
                {t("profile")}
              </Link>
            )}

            {/* Mobile Language Switcher */}
            <div className="border-t border-gray-200 pt-2">
              <p className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                {t("language")}
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
