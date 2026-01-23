import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSession } from "~/auth/server";
import { ForgotPasswordClient } from "./forgot-password-client";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  const t = await getTranslations("auth");

  // If user is already logged in, redirect to home
  if (session?.user) {
    redirect("/");
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
            {t("resetPassword")}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t("enterEmailForReset")}
          </p>
        </div>

        <ForgotPasswordClient />

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600">
          <Link
            href="/auth/signin"
            className="font-medium text-green-600 hover:text-green-500"
          >
            {t("backToSignIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
