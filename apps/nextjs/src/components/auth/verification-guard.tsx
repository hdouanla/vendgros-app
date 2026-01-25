"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@acme/auth/client";

export function VerificationGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkVerification = async () => {
      const result = await authClient.getSession();

      if (!result.data?.user) {
        // Not logged in, redirect to signin
        router.push("/auth/signin");
        return;
      }

      if (!result.data.user.emailVerified) {
        // Email not verified, redirect to verification page
        router.push("/auth/verify-email");
        return;
      }

      setIsChecking(false);
    };

    checkVerification();
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
