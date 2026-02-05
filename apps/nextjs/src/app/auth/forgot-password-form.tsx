"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authClient } from "@acme/auth/client";
import { TurnstileWidget } from "~/components/ui/turnstile-widget";
import { useTurnstile } from "~/hooks/use-turnstile";

type Step = "email" | "reset";

export function ForgotPasswordForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { widgetRef, isReady, turnstileHeaders, onSuccess, onError, onExpire, reset: resetTurnstile } = useTurnstile();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password",
        fetchOptions: { headers: turnstileHeaders },
      });

      if (result.error) {
        resetTurnstile();
        setError(result.error.message || t("failedToSendCode"));
      } else {
        resetTurnstile();
        setSuccess(t("codeSent"));
        setStep("reset");
      }
    } catch (err) {
      resetTurnstile();
      setError(t("unexpectedError"));
      console.error("Send code error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("passwordMinLength"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password: newPassword,
      });

      if (result.error) {
        setError(result.error.message || t("failedToResetPassword"));
      } else {
        setSuccess(t("passwordResetSuccess"));
        // Redirect to signin after a short delay
        setTimeout(() => {
          router.push("/auth/signin");
        }, 2000);
      }
    } catch (err) {
      setError(t("unexpectedError"));
      console.error("Reset password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setIsLoading(true);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "forget-password",
        fetchOptions: { headers: turnstileHeaders },
      });

      if (result.error) {
        resetTurnstile();
        setError(result.error.message || t("failedToSendCode"));
      } else {
        resetTurnstile();
        setSuccess(t("codeSent"));
      }
    } catch (err) {
      resetTurnstile();
      setError(t("unexpectedError"));
      console.error("Resend code error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "email") {
    return (
      <div className="rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSendCode} className="space-y-4">
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
              autoFocus
            />
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
            {isLoading ? t("sending") : t("sendResetCode")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-8 shadow-md">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-600">{t("enterResetCode")}</p>
        <p className="font-medium text-gray-900">{email}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label
            htmlFor="otp"
            className="block text-sm font-medium text-gray-700"
          >
            {t("verificationCode")}
          </label>
          <input
            id="otp"
            name="otp"
            type="text"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl font-mono tracking-widest shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="000000"
          />
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700"
          >
            {t("newPassword")}
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="••••••••"
          />
          <p className="mt-1 text-xs text-gray-500">{t("passwordMinLengthHint")}</p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            {t("confirmNewPassword")}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || otp.length !== 6}
          className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? t("resettingPassword") : t("resetPasswordButton")}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={isLoading}
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {t("resendCode")}
        </button>

        <button
          type="button"
          onClick={() => setStep("email")}
          className="w-full text-sm text-gray-600 hover:text-gray-900"
        >
          {t("changeEmail")}
        </button>
      </div>
    </div>
  );
}
