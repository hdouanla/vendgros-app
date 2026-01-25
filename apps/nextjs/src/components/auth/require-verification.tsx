"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

/**
 * Component that enforces email verification.
 * Redirects to /auth/verify-email if user is logged in but not verified.
 */
export function RequireVerification({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isLoading } = api.auth.getSession.useQuery();

  useEffect(() => {
    if (!isLoading && session?.user) {
      if (!session.user.emailVerified) {
        router.replace("/auth/verify-email");
      }
    }
  }, [session, isLoading, router]);

  // Don't render children if user is not verified
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (session?.user && !session.user.emailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Redirecting to verification...</div>
      </div>
    );
  }

  return <>{children}</>;
}
