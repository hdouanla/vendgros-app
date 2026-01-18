"use client";

import dynamic from "next/dynamic";

const VerifyEmailForm = dynamic(() => import("../verify-email-form").then(mod => ({ default: mod.VerifyEmailForm })), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg bg-white p-8 shadow-md">
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
      </div>
    </div>
  ),
});

export function VerifyEmailClient({ userEmail }: { userEmail: string }) {
  return <VerifyEmailForm userEmail={userEmail} />;
}
