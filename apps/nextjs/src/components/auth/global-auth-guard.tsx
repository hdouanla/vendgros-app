"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@acme/auth/client";

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

export function GlobalAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true);
      setShouldRender(false);

      const data = await authClient.getSession();

      // If not logged in, allow access to public and auth pages
      if (!data?.user) {
        setIsChecking(false);
        setShouldRender(true);
        return;
      }

      // User is logged in
      const isVerified = data.user.accountStatus === "ACTIVE";
      const isOnVerifyPage = pathname === "/auth/verify-email";
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
        setIsChecking(false);
        setShouldRender(true);
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (isChecking || !shouldRender) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
