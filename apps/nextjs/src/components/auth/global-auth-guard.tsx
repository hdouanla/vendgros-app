"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@acme/auth/client";
import { api } from "~/trpc/react";

// Public pages that don't require authentication or verification
const publicPages = [
  "/",
  "/listings",
  "/terms",
  "/privacy",
];

// Auth pages
const authPages = [
  "/auth/signin",
  "/auth/signup",
  "/auth/verify-email",
  "/auth/verify-phone",
];

// Private pages that require verification
const privatePages = [
  "/seller",
  "/buyer",
  "/admin",
  "/profile",
  "/settings",
  "/listings/create",
  "/reservations",
];

// Pages that require phone verification
const phoneVerificationRequiredPages = [
  "/listings/create",
];

export function GlobalAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);

  // Check if current page requires phone verification
  const requiresPhoneVerification = phoneVerificationRequiredPages.some(
    (page) => pathname.startsWith(page)
  );

  // Only fetch phone status if needed
  const { data: phoneStatus, isLoading: phoneStatusLoading } =
    api.phoneVerification.getStatus.useQuery(undefined, {
      enabled: requiresPhoneVerification,
    });

  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true);
      setShouldRender(false);

      const result = await authClient.getSession();

      // If not logged in, allow access to public and auth pages
      if (!result.data?.user) {
        setIsChecking(false);
        setShouldRender(true);
        return;
      }

      // User is logged in - check emailVerified since accountStatus isn't in the session user type
      const isVerified = result.data.user.emailVerified;
      const isOnVerifyPage = pathname === "/auth/verify-email";
      const isOnPhoneVerifyPage = pathname === "/auth/verify-phone";
      const isOnAuthPage = pathname === "/auth/signin" || pathname === "/auth/signup";

      // Check if on a private page
      const isOnPrivatePage = privatePages.some(page => pathname.startsWith(page));

      // If logged in and on signin/signup, redirect based on verification status
      if (isOnAuthPage) {
        if (isVerified) {
          router.push("/");
        } else {
          router.push("/auth/verify-email");
        }
        setIsChecking(false);
        setShouldRender(false); // Don't render during redirect
        return;
      }

      // If not verified
      if (!isVerified) {
        // If trying to access a private page, redirect to verify
        if (isOnPrivatePage) {
          router.push("/auth/verify-email");
          setIsChecking(false);
          setShouldRender(false); // Don't render during redirect
          return;
        }
        // Allow access to public pages and verify page
        setIsChecking(false);
        setShouldRender(true);
      } else {
        // If verified and on verify page, redirect to home
        if (isOnVerifyPage) {
          router.push("/");
          setIsChecking(false);
          setShouldRender(false); // Don't render during redirect
          return;
        }

        // Check phone verification for pages that require it
        if (requiresPhoneVerification && !phoneStatusLoading) {
          if (!phoneStatus?.phoneVerified) {
            // Redirect to phone verification
            if (!phoneStatus?.phone) {
              router.push(
                "/profile/edit?redirect=" +
                  encodeURIComponent("/auth/verify-phone?redirect=" + pathname)
              );
            } else {
              router.push(
                "/auth/verify-phone?redirect=" + encodeURIComponent(pathname)
              );
            }
            setIsChecking(false);
            setShouldRender(false);
            return;
          }
        }

        // If on phone verify page and already verified, redirect to intended destination or home
        if (isOnPhoneVerifyPage && phoneStatus?.phoneVerified) {
          const params = new URLSearchParams(window.location.search);
          router.push(params.get("redirect") ?? "/");
          setIsChecking(false);
          setShouldRender(false);
          return;
        }

        setIsChecking(false);
        setShouldRender(true);
      }
    };

    // Wait for phone status to load if needed
    if (requiresPhoneVerification && phoneStatusLoading) {
      return;
    }

    checkAuth();
  }, [router, pathname, requiresPhoneVerification, phoneStatus, phoneStatusLoading]);

  if (isChecking || !shouldRender) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
