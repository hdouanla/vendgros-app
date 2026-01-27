"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface CMSErrorProps {
  /** Whether to show retry option */
  showRetry?: boolean;
}

/**
 * Error component displayed when CMS content fails to load
 */
export function CMSError({ showRetry = true }: CMSErrorProps) {
  const t = useTranslations("cms");

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="rounded-lg bg-white p-8 shadow-md text-center">
          {/* Error Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            {t("contentUnavailable")}
          </h1>
          <p className="mb-8 text-gray-600">{t("contentUnavailableMessage")}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
            >
              &larr; {t("backToHome")}
            </Link>

            {showRetry && (
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {t("tryAgain")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
