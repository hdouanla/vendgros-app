"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn, authClient } from "@acme/auth/client";
import { api } from "~/trpc/react";

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Don't use callbackURL here - we'll handle redirect manually based on verification
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || t("failedToSignIn"));
      } else {
        // Invalidate the session cache to update navbar immediately
        await utils.auth.getSession.invalidate();

        // Check if user needs email verification
        const session = await authClient.getSession();
        if (!session?.user?.emailVerified) {
          router.push("/auth/verify-email");
          router.refresh();
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
      }
    } catch (err) {
      setError(t("unexpectedError"));
      console.error("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-md">
      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Email/Password Form */}
      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            {t("emailAddress")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            {t("password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-700"
            >
              {t("rememberMe")}
            </label>
          </div>

          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-green-600 hover:text-green-500"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? t("signingIn") : t("signIn")}
        </button>
      </form>
    </div>
  );
}
