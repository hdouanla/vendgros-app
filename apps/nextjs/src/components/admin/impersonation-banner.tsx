"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function ImpersonationBanner() {
  const router = useRouter();
  const utils = api.useUtils();

  // Get current session which includes impersonation state
  const { data: session, isLoading } = api.auth.getSession.useQuery();

  const stopImpersonation = api.admin.stopImpersonation.useMutation({
    onSuccess: (data) => {
      // Set the cookie to clear impersonation
      if (data.cookie) {
        document.cookie = `${data.cookie.name}=${data.cookie.value};path=${data.cookie.options.path};max-age=${data.cookie.options.maxAge};samesite=${data.cookie.options.sameSite}${data.cookie.options.secure ? ";secure" : ""}`;
      }
      // Invalidate session and redirect
      void utils.auth.getSession.invalidate();
      router.push("/admin/users");
      router.refresh();
    },
  });

  // Don't render if loading or not impersonating
  if (isLoading || !session?.isImpersonating) {
    return null;
  }

  const originalAdmin = session.originalAdmin;
  const impersonatedUser = session.user;

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          {/* Left side - Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20">
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <div className="text-sm sm:text-base">
              <span className="font-medium">Impersonating:</span>{" "}
              <span className="font-bold">
                {impersonatedUser?.name || impersonatedUser?.email}
              </span>
              {impersonatedUser?.email && impersonatedUser?.name && (
                <span className="text-purple-200 ml-1">
                  ({impersonatedUser.email})
                </span>
              )}
            </div>
          </div>

          {/* Right side - Admin info and exit button */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-sm text-purple-200">
              Logged in as:{" "}
              <span className="font-medium text-white">
                {originalAdmin?.name || originalAdmin?.email}
              </span>
            </div>
            <button
              onClick={() => stopImpersonation.mutate()}
              disabled={stopImpersonation.isPending}
              className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm transition-all hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-700 disabled:opacity-50"
            >
              {stopImpersonation.isPending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Exiting...
                </>
              ) : (
                <>
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
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Exit Impersonation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
