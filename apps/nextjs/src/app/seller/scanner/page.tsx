"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import Link from "next/link";

export default function QRScannerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledCode = searchParams.get("code");

  const [verificationCode, setVerificationCode] = useState(prefilledCode || "");
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();

  const verifyCodeMutation = api.reservation.verifyCode.useMutation({
    onSuccess: (data) => {
      setScanResult(data);
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
      setScanResult(null);
    },
  });

  const completePickupMutation = api.reservation.completePickup.useMutation({
    onSuccess: () => {
      // Redirect to dashboard after completion
      router.push("/seller?pickup=complete");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-character code");
      return;
    }

    setError(null);
    verifyCodeMutation.mutate({ verificationCode: verificationCode.toUpperCase() });
  };

  const handleCompletePickup = async () => {
    if (!scanResult?.reservationId) return;

    completePickupMutation.mutate({
      reservationId: scanResult.reservationId,
    });
  };

  useEffect(() => {
    // If code is prefilled from URL, auto-verify
    if (prefilledCode && prefilledCode.length === 6) {
      verifyCodeMutation.mutate({ verificationCode: prefilledCode.toUpperCase() });
    }
  }, [prefilledCode]);

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=/seller/scanner");
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/seller"
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Verify Pickup</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter the buyer's verification code to complete the pickup
        </p>
      </div>

      {/* QR Scanner Placeholder */}
      <div className="mb-8 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 p-8 text-center">
        <div className="mb-4 text-6xl">📷</div>
        <p className="text-sm text-gray-600">
          QR Code Camera Scanner (Coming Soon)
        </p>
        <p className="mt-2 text-xs text-gray-500">
          For now, use manual code entry below
        </p>
      </div>

      {/* Manual Code Entry */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Manual Code Entry
        </h2>

        <div className="mb-4">
          <label
            htmlFor="code"
            className="block text-sm font-medium text-gray-700"
          >
            Verification Code
          </label>
          <input
            type="text"
            id="code"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
              setVerificationCode(value.slice(0, 6));
            }}
            maxLength={6}
            placeholder="ABC123"
            className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-3 text-center text-2xl font-mono uppercase tracking-widest shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          />
          <p className="mt-2 text-xs text-gray-500">
            Enter the 6-character code from the buyer's reservation
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleVerifyCode}
          disabled={
            verificationCode.length !== 6 || verifyCodeMutation.isPending
          }
          className="w-full rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {verifyCodeMutation.isPending ? "Verifying..." : "Verify Code"}
        </button>
      </div>

      {/* Verification Result */}
      {scanResult && (
        <div className="mt-8 rounded-lg bg-green-50 p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-green-900">
              ✓ Valid Reservation
            </h2>
            <span className="rounded-full bg-green-200 px-3 py-1 text-xs font-medium text-green-900">
              VERIFIED
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Buyer:</span>
              <p className="mt-1 text-gray-900">{scanResult.buyerInfo.email}</p>
              {scanResult.buyerInfo.phone && (
                <p className="text-gray-900">{scanResult.buyerInfo.phone}</p>
              )}
            </div>

            <div>
              <span className="font-medium text-gray-700">Quantity:</span>
              <p className="mt-1 text-gray-900">{scanResult.quantity} units</p>
            </div>

            <div className="border-t border-green-200 pt-3">
              <span className="font-medium text-gray-700">Balance Due (Cash):</span>
              <p className="mt-1 text-2xl font-bold text-green-900">
                ${scanResult.balanceDue.toFixed(2)} CAD
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-900">
              ⚠️ Collect Cash Payment
            </p>
            <p className="mt-1 text-xs text-yellow-800">
              Ensure you've received the balance payment in cash before
              completing the pickup.
            </p>
          </div>

          <button
            onClick={handleCompletePickup}
            disabled={completePickupMutation.isPending}
            className="mt-6 w-full rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {completePickupMutation.isPending
              ? "Completing..."
              : "✓ Complete Pickup"}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 rounded-lg bg-gray-50 p-6">
        <h3 className="mb-3 font-medium text-gray-900">How it works:</h3>
        <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
          <li>Buyer shows you their QR code or verification code</li>
          <li>Enter the 6-character code above</li>
          <li>Verify the buyer's details and quantity</li>
          <li>Collect the remaining balance in cash</li>
          <li>Click "Complete Pickup" to finalize the transaction</li>
        </ol>
      </div>
    </div>
  );
}
