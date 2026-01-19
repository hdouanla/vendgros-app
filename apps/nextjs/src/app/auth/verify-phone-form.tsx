"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@acme/auth/client";
import { api } from "~/trpc/react";

interface VerifyPhoneFormProps {
  userPhone: string | null;
  redirectUrl?: string;
}

export function VerifyPhoneForm({ userPhone, redirectUrl }: VerifyPhoneFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const finalRedirectUrl = redirectUrl ?? searchParams.get("redirect") ?? "/";

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const sendOTP = api.phoneVerification.sendOTP.useMutation({
    onSuccess: () => {
      setSuccess("Verification code sent! Check your phone.");
      setError("");
      setCooldown(60);
    },
    onError: (err) => {
      if (err.data?.code === "TOO_MANY_REQUESTS") {
        setCooldown(60);
      }
      setError(err.message);
      setSuccess("");
    },
  });

  const verifyOTP = api.phoneVerification.verifyOTP.useMutation({
    onSuccess: async () => {
      setSuccess("Phone number verified successfully!");
      setError("");
      // Invalidate caches
      await utils.auth.getSession.invalidate();
      await utils.user.getCurrentUser.invalidate();
      await utils.phoneVerification.getStatus.invalidate();
      // Redirect after short delay
      setTimeout(() => {
        router.push(finalRedirectUrl);
        router.refresh();
      }, 1000);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const handleSendCode = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await sendOTP.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await verifyOTP.mutateAsync({ otp: verificationCode });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    await utils.auth.getSession.invalidate();
    router.push("/auth/signin");
    router.refresh();
  };

  // If user has no phone number, show message to add one
  if (!userPhone) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Phone Number Required
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You need to add a phone number to your profile before you can verify it.
          </p>
        </div>

        <button
          onClick={() => router.push("/profile/edit?redirect=" + encodeURIComponent(finalRedirectUrl))}
          className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Add Phone Number
        </button>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Format phone number for display
  const formattedPhone = userPhone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");

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
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Verify your phone
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          We'll send a 6-digit verification code to
        </p>
        <p className="font-medium text-gray-900">{formattedPhone}</p>
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

      {/* Send Code Button */}
      <button
        type="button"
        onClick={handleSendCode}
        disabled={isLoading || sendOTP.isPending || cooldown > 0}
        className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {sendOTP.isPending
          ? "Sending..."
          : cooldown > 0
            ? `Resend Code (${cooldown}s)`
            : "Send Verification Code"}
      </button>

      {/* Change Phone Number Button */}
      <button
        type="button"
        onClick={() => router.push("/profile/edit?redirect=" + encodeURIComponent(finalRedirectUrl))}
        className="mt-3 mb-6 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        Change Phone Number
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">
            Enter code when received
          </span>
        </div>
      </div>

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
            inputMode="numeric"
            required
            maxLength={6}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-center text-2xl font-mono tracking-widest shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="000000"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter the 6-digit code from your SMS
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || verifyOTP.isPending || verificationCode.length !== 6}
          className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {verifyOTP.isPending ? "Verifying..." : "Verify Phone"}
        </button>
      </form>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full text-sm text-gray-600 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>

      <div className="mt-6 text-center text-xs text-gray-500">
        <p>Phone verification is required to buy or sell on Vendgros.</p>
      </div>
    </div>
  );
}
