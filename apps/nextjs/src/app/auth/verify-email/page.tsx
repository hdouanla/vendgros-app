import { redirect } from "next/navigation";
import { getSession } from "~/auth/server";
import { VerifyEmailClient } from "./verify-email-client";

// Disable caching to always check fresh session data
export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage() {
  const session = await getSession();

  // Redirect to signin if not logged in
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Redirect to home if already verified
  if (session.user.emailVerified) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        <VerifyEmailClient userEmail={session.user.email} />
      </div>
    </div>
  );
}
