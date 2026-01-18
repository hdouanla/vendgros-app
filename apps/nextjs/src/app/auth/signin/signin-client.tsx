"use client";

import dynamic from "next/dynamic";

const SignInForm = dynamic(() => import("../signin-form").then(mod => ({ default: mod.SignInForm })), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg bg-white p-8 shadow-md">
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
      </div>
    </div>
  ),
});

export function SignInClient({ callbackUrl }: { callbackUrl: string }) {
  return <SignInForm callbackUrl={callbackUrl} />;
}
