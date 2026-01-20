import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "~/auth/server";
import { SignInClient } from "./signin-client";

export default async function SignInPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await getSession();
  const searchParams = await props.searchParams;
  const callbackUrl = searchParams.callbackUrl || "/";

  // If user is already logged in, redirect based on verification status
  if (session?.user) {
    if (session.user.emailVerified) {
      redirect(callbackUrl);
    } else {
      redirect("/auth/verify-email");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold text-green-600">
            VendGros
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Or{" "}
            <Link
              href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="font-medium text-green-600 hover:text-green-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <SignInClient callbackUrl={callbackUrl} />

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/terms-of-service" className="font-medium text-green-600 hover:text-green-500">
            Terms of Service
          </Link>{" "}
          &bull;{" "}
          <Link href="/privacy-policy" className="font-medium text-green-600 hover:text-green-500">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
