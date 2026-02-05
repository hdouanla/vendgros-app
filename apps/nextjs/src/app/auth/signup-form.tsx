"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signUp, signIn } from "@acme/auth/client";
import { api } from "~/trpc/react";
import { TurnstileWidget } from "~/components/ui/turnstile-widget";
import { useTurnstile } from "~/hooks/use-turnstile";
import { SocialAuthButtons } from "~/components/auth/social-auth-buttons";

export function SignUpForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { widgetRef, isReady, turnstileHeaders, onSuccess, onError, onExpire, reset: resetTurnstile } = useTurnstile();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!acceptedTerms) {
      setError(t("mustAcceptTerms"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    if (formData.password.length < 8) {
      setError(t("passwordMinLength"));
      return;
    }

    setIsLoading(true);

    try {
      // Don't use callbackURL - we'll always redirect to verify-email
      const result = await signUp.email({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        fetchOptions: { headers: turnstileHeaders },
      });

      if (result.error) {
        resetTurnstile();
        setError(result.error.message || t("failedToCreateAccount"));
      } else {
        // Sign in the user and redirect to verification page
        await signIn.email({
          email: formData.email,
          password: formData.password,
          fetchOptions: { headers: turnstileHeaders },
        });

        // Invalidate the session cache to update navbar immediately
        await utils.auth.getSession.invalidate();

        router.push("/auth/verify-email");
        router.refresh();
      }
    } catch (err) {
      resetTurnstile();
      setError(t("unexpectedError"));
      console.error("Sign up error:", err);
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

      {/* Sign Up Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            {t("name")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="John Doe"
          />
        </div>

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
            value={formData.email}
            onChange={handleChange}
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
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="••••••••"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t("passwordMinLengthHint")}
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            {t("confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="••••••••"
          />
        </div>

        {/* Terms and Privacy Policy Checkbox */}
        <div className="flex items-start">
          <div className="flex h-5 items-center">
            <input
              id="acceptTerms"
              name="acceptTerms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="acceptTerms" className="text-gray-700">
              {t("iAgreeToTerms")}{" "}
              <Link
                href="/terms-of-service"
                target="_blank"
                className="font-medium text-green-600 hover:text-green-500"
              >
                {t("termsOfService")}
              </Link>{" "}
              {t("and")}{" "}
              <Link
                href="/privacy-policy"
                target="_blank"
                className="font-medium text-green-600 hover:text-green-500"
              >
                {t("privacyPolicy")}
              </Link>
            </label>
          </div>
        </div>

        <TurnstileWidget
          ref={widgetRef}
          onSuccess={onSuccess}
          onError={onError}
          onExpire={onExpire}
        />

        <button
          type="submit"
          disabled={isLoading || !isReady}
          className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? t("creatingAccount") : t("createAccount")}
        </button>
      </form>

      {/* Social Auth Divider */}
      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">{t("orContinueWith")}</span>
        </div>
      </div>

      {/* Social Auth Buttons */}
      <div className="mt-6">
        <SocialAuthButtons mode="signup" callbackUrl={callbackUrl} onError={setError} />
      </div>
    </div>
  );
}
