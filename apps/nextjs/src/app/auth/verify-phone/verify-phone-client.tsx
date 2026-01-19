"use client";

import dynamic from "next/dynamic";

const VerifyPhoneForm = dynamic(
  () => import("../verify-phone-form").then((mod) => ({ default: mod.VerifyPhoneForm })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg bg-white p-8 shadow-md">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
        </div>
      </div>
    ),
  }
);

interface VerifyPhoneClientProps {
  userPhone: string | null;
  redirectUrl?: string;
}

export function VerifyPhoneClient({ userPhone, redirectUrl }: VerifyPhoneClientProps) {
  return <VerifyPhoneForm userPhone={userPhone} redirectUrl={redirectUrl} />;
}
