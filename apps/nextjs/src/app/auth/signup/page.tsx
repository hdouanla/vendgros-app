import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSession } from "~/auth/server";
import { SignUpClient } from "./signup-client";

export default async function SignUpPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await getSession();
  const searchParams = await props.searchParams;
  const callbackUrl = searchParams.callbackUrl || "/";
  const t = await getTranslations("auth");

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
            {t("createAccount")}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="font-medium text-green-600 hover:text-green-500"
            >
              {t("signIn")}
            </Link>
          </p>
        </div>

        <SignUpClient callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
