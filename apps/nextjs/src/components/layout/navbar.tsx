"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const { data: session, isLoading } = api.auth.getSession.useQuery();
  const utils = api.useUtils();

  const isVerified = session?.user?.emailVerified === true;

  // Get unread chat count
  const { data: unreadCount } = api.chat.getTotalUnreadCount.useQuery(undefined, {
    enabled: !!session?.user && isVerified,
    refetchInterval: 60000, // Refresh every minute
  });

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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-green-600">VendGros</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link
              href="/listings/search"
              className={`text-sm font-medium transition-colors ${
                isActive("/listings/search")
                  ? "text-green-600"
                  : "text-gray-700 hover:text-green-600"
              }`}
            >
              Search Listings
            </Link>

            {session?.user && isVerified && (
              <>
                <Link
                  href="/listings/create"
                  className={`text-sm font-medium transition-colors ${
                    isActive("/listings/create")
                      ? "text-green-600"
                      : "text-gray-700 hover:text-green-600"
                  }`}
                >
                  + Create Listing
                </Link>

                <Link
                  href="/seller"
                  className={`flex items-center space-x-1 text-sm font-medium transition-colors ${
                    isActive("/seller")
                      ? "text-green-600"
                      : "text-gray-700 hover:text-green-600"
                  }`}
                >
                  <span>📊</span>
                  <span>Seller Dashboard</span>
                </Link>

                <Link
                  href="/chat"
                  className={`relative flex items-center text-sm font-medium transition-colors ${
                    isActive("/chat")
                      ? "text-green-600"
                      : "text-gray-700 hover:text-green-600"
                  }`}
                >
                  <span>Chats</span>
                  {unreadCount && unreadCount > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-green-600 px-1.5 text-xs font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>

          {/* Right side - User Menu */}
          <div className="flex items-center space-x-4">
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
                        <>
                          <Link
                            href="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setShowUserMenu(false)}
                          >
                            Profile
                          </Link>

                          <Link
                            href="/reservations"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setShowUserMenu(false)}
                          >
                            My Reservations
                          </Link>

                          <Link
                            href="/chat"
                            className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <span>Chats</span>
                            {unreadCount && unreadCount > 0 && (
                              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-green-600 px-1.5 text-xs font-bold text-white">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </Link>

                          <Link
                            href="/seller"
                            className="block border-t border-gray-100 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
                            onClick={() => setShowUserMenu(false)}
                          >
                            📊 Seller Dashboard
                          </Link>

                          <Link
                            href="/seller/analytics"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => setShowUserMenu(false)}
                          >
                            Analytics
                          </Link>
                        </>
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
              Search Listings
            </Link>

            {session?.user && isVerified && (
              <>
                <Link
                  href="/listings/create"
                  className={`block rounded-md px-3 py-2 text-base font-medium ${
                    isActive("/listings/create")
                      ? "bg-green-50 text-green-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  + Create Listing
                </Link>

                <Link
                  href="/seller"
                  className={`block rounded-md px-3 py-2 text-base font-medium ${
                    isActive("/seller")
                      ? "bg-green-50 text-green-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  📊 Seller Dashboard
                </Link>

                <Link
                  href="/profile"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Profile
                </Link>

                <Link
                  href="/reservations"
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowMobileMenu(false)}
                >
                  My Reservations
                </Link>

                <Link
                  href="/chat"
                  className="flex items-center justify-between rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <span>Chats</span>
                  {unreadCount && unreadCount > 0 && (
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-green-600 px-1.5 text-xs font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
