"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
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
        <div className="mt-8 space-y-4">
          {/* Valid Reservation Header */}
          <div className="rounded-lg bg-green-50 p-4 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-green-900">
                ✓ Valid Reservation
              </h2>
              <span className="rounded-full bg-green-200 px-3 py-1 text-xs font-medium text-green-900">
                VERIFIED
              </span>
            </div>
          </div>

          {/* Listing Details */}
          {scanResult.listing && (
            <div className="rounded-lg bg-white p-4 shadow-md">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Product Details
              </h3>
              <div className="flex gap-4">
                {scanResult.listing.image && (
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={scanResult.listing.image}
                      alt={scanResult.listing.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {scanResult.listing.title}
                  </h4>
                  {scanResult.listing.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {scanResult.listing.description}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">${(Number(scanResult.pricePerPiece) * 1.05).toFixed(2)}</span>
                    {" "}per piece
                  </p>
                  {scanResult.listing.category && (
                    <p className="mt-1 text-xs text-gray-500">
                      Category: {scanResult.listing.category}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Order Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium text-gray-900">
                  {scanResult.quantity} {scanResult.quantity === 1 ? "piece" : "pieces"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Price:</span>
                <span className="font-medium text-gray-900">
                  ${(Number(scanResult.totalPrice) * 1.05).toFixed(2)} CAD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Deposit Paid:</span>
                <span className="font-medium text-green-600">
                  ${Number(scanResult.depositPaid).toFixed(2)} CAD
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-900">Balance Due:</span>
                <span className="text-xl font-bold text-green-700">
                  ${Number(scanResult.balanceDue).toFixed(2)} CAD
                </span>
              </div>
            </div>
          </div>

          {/* Buyer Information */}
          <div className="rounded-lg bg-white p-4 shadow-md">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Buyer Information
            </h3>
            <div className="space-y-1 text-sm">
              {scanResult.buyerInfo.name && (
                <p className="font-medium text-gray-900">{scanResult.buyerInfo.name}</p>
              )}
              <p className="text-gray-700">{scanResult.buyerInfo.email}</p>
              {scanResult.buyerInfo.phone && (
                <p className="text-gray-700">{scanResult.buyerInfo.phone}</p>
              )}
            </div>
          </div>

          {/* Cash Payment Warning */}
          <div className="rounded-lg bg-yellow-50 p-4 shadow-md">
            <p className="text-sm font-medium text-yellow-900">
              ⚠️ Collect Cash Payment
            </p>
            <p className="mt-1 text-xs text-yellow-800">
              Ensure you've received the balance payment of{" "}
              <strong>${Number(scanResult.balanceDue).toFixed(2)} CAD</strong> in cash
              before completing the pickup.
            </p>
          </div>

          {/* Complete Pickup Button */}
          <button
            onClick={handleCompletePickup}
            disabled={completePickupMutation.isPending}
            className="w-full rounded-md bg-green-600 px-6 py-4 text-lg font-semibold text-white shadow-md hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
