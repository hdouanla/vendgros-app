"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@acme/auth/client";
import { api } from "~/trpc/react";

export function VerifyEmailForm({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Don't auto-send email - it's already sent during signup
  // Users can click "Resend Code" if they need a new one

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsVerifying(true);

    try {
      // Use the emailOTP plugin's verification method
      const result = await authClient.emailOtp.verifyEmail({
        email: userEmail,
        otp: verificationCode,
      });

      if (result.error) {
        setError(result.error.message || "Invalid verification code");
      } else {
        // Successfully verified! Better Auth automatically updates email_verified
        // Invalidate the session cache to update navbar immediately
        await utils.auth.getSession.invalidate();

        // Redirect to home
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("Failed to verify code");
      console.error("Verification error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setIsVerifying(true);

    try {
      const result = await authClient.sendVerificationEmail({
        email: userEmail,
      });

      if (result.error) {
        setError(result.error.message || "Failed to resend code");
      } else {
        setEmailSent(true);
        alert("Verification code sent! Check your email.");
      }
    } catch (err) {
      setError("Failed to resend code");
      console.error("Resend error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    // Invalidate the session cache to update navbar immediately
    await utils.auth.getSession.invalidate();
    router.push("/auth/signin");
    router.refresh();
  };

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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Verify your email
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Check your email for a 6-digit verification code sent to
        </p>
        <p className="font-medium text-gray-900">{userEmail}</p>
        <p className="mt-1 text-xs text-gray-500">
          Didn't receive it? Click "Resend Code" below
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {emailSent && !error && (
        <div className="mb-4 rounded-md bg-green-50 p-3">
          <p className="text-sm text-green-800">
            Verification code sent! Check your email.
          </p>
        </div>
      )}

      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div>
          <label
            htmlFor="verificationCode"
            className="block text-sm font-medium text-gray-700"
          >
            Verification Code
          </label>
          <input
            id="verificationCode"
            name="verificationCode"
            type="text"
            required
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl font-mono tracking-widest shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="000000"
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the 6-digit code from your email
          </p>
        </div>

        <button
          type="submit"
          disabled={isVerifying || verificationCode.length !== 6}
          className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isVerifying ? "Verifying..." : "Verify Email"}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={isVerifying}
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Resend Code
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full text-sm text-gray-600 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>

      <div className="mt-6 text-center text-xs text-gray-500">
        <p>You must verify your email to access your account.</p>
      </div>
    </div>
  );
}
