"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { QRCode } from "@acme/ui/qr-code";
import { PaymentCountdownTimer } from "~/components/reservations/payment-countdown-timer";
import { RatingModal } from "~/components/ratings/rating-modal";
import { env } from "~/env";

// Simple translation stub - replace with actual translations later
const t = (key: string) => {
  const translations: Record<string, string> = {
    "common.loading": "Loading...",
    "errors.notFound": "Reservation not found",
    "reservation.reservation": "Reservation",
    "reservation.reservationCode": "Reservation Code",
    "reservation.status.confirmed": "Confirmed - Ready for pickup",
    "reservation.status.pending": "Pending payment",
    "reservation.status.completed": "Completed",
    "reservation.status.cancelled": "Cancelled",
    "listing.quantity": "Quantity",
    "reservation.totalPrice": "Total Price",
    "reservation.depositAmount": "Deposit Paid (5%)",
    "reservation.balanceDue": "Balance Due at Pickup",
    "reservation.payDeposit": "Pay Deposit Now",
    "listing.seller": "Seller Information",
    "listing.buyer": "Buyer Information",
    "reservation.qrCode": "Pickup QR Code",
    "reservation.pickupInstructions": "Show this QR code to the seller during pickup",
  };
  return translations[key] || key;
};

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user is coming back from payment
  const paymentPending = searchParams.get("payment") === "pending";
  const [isPolling, setIsPolling] = useState(paymentPending);
  const [pollCount, setPollCount] = useState(0);
  const maxPollAttempts = 30; // Poll for up to 30 seconds
  const [timerExpired, setTimerExpired] = useState(true); // Default to expired, will be set correctly when reservation loads
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: reservation, isLoading: reservationLoading, refetch: refetchReservation } = api.reservation.getById.useQuery({
    id,
  }, {
    enabled: !!session?.user,
  });

  const { data: paymentStatus, refetch: refetchPaymentStatus } = api.payment.getPaymentStatus.useQuery(
    {
      reservationId: id,
    },
    {
      enabled: !!reservation,
      refetchInterval: isPolling ? 1000 : false, // Poll every second when waiting for payment
    },
  );

  // Check if user can rate this reservation
  const { data: ratingStatus } = api.rating.getForReservation.useQuery(
    { reservationId: id },
    { enabled: !!reservation && reservation.status === "COMPLETED" },
  );

  // Calculate if timer is expired when reservation loads
  useEffect(() => {
    if (reservation) {
      const timeoutMinutes = env.NEXT_PUBLIC_RESERVATION_PAYMENT_TIMEOUT_MINUTES;
      const createdAt = new Date(reservation.createdAt).getTime();
      const deadline = createdAt + timeoutMinutes * 60 * 1000;
      const now = Date.now();
      setTimerExpired(now >= deadline);
    }
  }, [reservation]);

  // Handle polling for payment confirmation
  useEffect(() => {
    if (!isPolling) return;

    // Stop polling if payment is confirmed
    if (paymentStatus?.depositPaid) {
      setIsPolling(false);
      // Remove the payment=pending param from URL
      router.replace(`/reservations/${id}`);
      // Refetch reservation to get updated status
      void refetchReservation();
      return;
    }

    // Stop polling after max attempts
    if (pollCount >= maxPollAttempts) {
      setIsPolling(false);
      return;
    }

    // Increment poll count
    const timer = setTimeout(() => {
      setPollCount((prev) => prev + 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isPolling, paymentStatus, pollCount, id, router, refetchReservation]);

  if (sessionLoading || reservationLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent(`/reservations/${id}`));
    return null;
  }

  if (!reservation) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("errors.notFound")}</p>
      </div>
    );
  }

  const isExpired = new Date(reservation.expiresAt) < new Date();
  const viewerRole = reservation.viewerRole; // "buyer" | "seller" | "both"
  const isBuyer = viewerRole === "buyer" || viewerRole === "both";
  const isSeller = viewerRole === "seller" || viewerRole === "both";
  const depositPaid = paymentStatus?.depositPaid ?? false;

  // Show processing overlay while polling for payment
  if (isPolling) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          {/* Animated Spinner */}
          <div className="relative mb-8">
            <div className="h-24 w-24 rounded-full border-4 border-gray-200"></div>
            <div className="absolute left-0 top-0 h-24 w-24 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
          </div>

          {/* Processing Text */}
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Processing Payment
          </h2>
          <p className="mb-6 text-center text-gray-600">
            Please wait while we confirm your payment...
          </p>

          {/* Progress Indicator */}
          <div className="mb-4 w-64">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-green-600 transition-all duration-1000"
                style={{ width: `${Math.min((pollCount / maxPollAttempts) * 100, 100)}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-gray-500">
            This usually takes a few seconds
          </p>

          {/* Show timeout message after 20 seconds */}
          {pollCount >= 20 && (
            <div className="mt-6 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="font-medium">Taking longer than expected?</p>
              <p className="mt-1">
                Your payment may still be processing. The page will update automatically,
                or you can{" "}
                <button
                  onClick={() => {
                    void refetchPaymentStatus();
                    void refetchReservation();
                  }}
                  className="font-medium underline"
                >
                  refresh manually
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("reservation.reservation")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("reservation.reservationCode")}: {reservation.verificationCode}
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={`mb-6 rounded-lg p-4 ${
          reservation.status === "CONFIRMED" || depositPaid
            ? "bg-green-50 text-green-800"
            : reservation.status === "PENDING"
              ? "bg-yellow-50 text-yellow-800"
              : "bg-gray-50 text-gray-800"
        }`}
      >
        <p className="font-medium">
          {depositPaid && reservation.status === "PENDING"
            ? t("reservation.status.confirmed")
            : t(`reservation.status.${reservation.status.toLowerCase()}`)}
        </p>
        {isExpired && (
          <p className="mt-1 text-sm">
            This reservation has expired
          </p>
        )}
      </div>

      {/* Rating CTA - Show when transaction is completed */}
      {reservation.status === "COMPLETED" && (
        <div className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-6">
          {ratingStatus?.ownRating ? (
            // User has already rated - show with edit option
            <div className="text-center">
              <div className="mb-2 text-4xl">✅</div>
              <h3 className="text-lg font-semibold text-green-800">
                Thanks for your feedback!
              </h3>
              <p className="mt-1 text-sm text-green-700">
                You rated this transaction {ratingStatus.ownRating.score}/5 stars
              </p>
              {!ratingStatus.otherRating && (
                <p className="mt-2 text-xs text-green-600">
                  Your rating will be visible once the other party also submits their rating
                </p>
              )}
              <button
                onClick={() => setIsRatingModalOpen(true)}
                className="mt-4 inline-block rounded-md border border-green-600 bg-white px-6 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
              >
                Edit Rating
              </button>
            </div>
          ) : (
            // User hasn't rated yet
            <div className="text-center">
              <div className="mb-2 text-4xl">⭐</div>
              <h3 className="text-lg font-semibold text-green-800">
                Rate Your Experience
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Help build trust in our community by rating this transaction
              </p>
              <p className="mt-2 text-xs text-green-600">
                Ratings are blind - both parties must rate before reviews become visible
              </p>
              <button
                onClick={() => setIsRatingModalOpen(true)}
                className="mt-4 inline-block rounded-md bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
              >
                Rate Now
              </button>
            </div>
          )}
          <RatingModal
            reservationId={id}
            targetName={
              isBuyer
                ? reservation.listing.seller?.name || reservation.listing.seller?.email || "Seller"
                : reservation.buyer?.name || reservation.buyer?.email || "Buyer"
            }
            targetRole={isBuyer ? "seller" : "buyer"}
            isOpen={isRatingModalOpen}
            onClose={() => setIsRatingModalOpen(false)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column - Listing Details */}
        <div className="space-y-6">
          {/* Listing Info */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {reservation.listing.title}
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("listing.quantity")}:</span>
                <span className="font-medium">
                  {reservation.quantityReserved} units
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  {t("reservation.totalPrice")}:
                </span>
                <span className="font-medium">
                  ${reservation.totalPrice.toFixed(2)} CAD
                </span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">
                  {t("reservation.depositAmount")}:
                </span>
                <span className="font-medium text-green-600">
                  ${reservation.depositAmount.toFixed(2)} CAD
                </span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">
                  {t("reservation.balanceDue")}:
                </span>
                <span className="text-xl font-bold">
                  ${(reservation.totalPrice - reservation.depositAmount).toFixed(2)}{" "}
                  CAD
                </span>
              </div>
            </div>
          </div>

          {/* Pickup Details - Only show after payment */}
          {depositPaid && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Pickup Details</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Address:</span>
                  <p className="mt-1">{reservation.listing.pickupAddress}</p>
                </div>

                {reservation.listing.pickupInstructions && (
                  <div>
                    <span className="font-medium text-gray-600">
                      Instructions:
                    </span>
                    <p className="mt-1">
                      {reservation.listing.pickupInstructions}
                    </p>
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-600">
                    Pickup Deadline:
                  </span>
                  <p className="mt-1">
                    {new Date(reservation.expiresAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buyer Info - Show to seller after payment */}
          {depositPaid && isSeller && reservation.buyer && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">
                {t("listing.buyer")}
              </h3>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Name:</span>
                  <p className="mt-1">{reservation.buyer.name}</p>
                </div>

                <div>
                  <span className="font-medium text-gray-600">Contact:</span>
                  <p className="mt-1">{reservation.buyer.email}</p>
                  {reservation.buyer.phone && <p>{reservation.buyer.phone}</p>}
                </div>

                <div>
                  <span className="font-medium text-gray-600">Buyer Rating:</span>
                  <p className="mt-1">
                    ⭐{" "}
                    {reservation.buyer.buyerRatingAverage?.toFixed(1) ?? "—"}{" "}
                    ({reservation.buyer.buyerRatingCount ?? 0} reviews)
                  </p>
                </div>
              </div>

              {/* Chat with Buyer Button */}
              <Link
                href={`/chat/${id}`}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Chat with Buyer
              </Link>
            </div>
          )}

          {/* Seller Info - Show to buyer after payment */}
          {depositPaid && isBuyer && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">
                {t("listing.seller")}
              </h3>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Name:</span>
                  <p className="mt-1">{reservation.listing.seller.name}</p>
                </div>

                <div>
                  <span className="font-medium text-gray-600">Contact:</span>
                  <p className="mt-1">{reservation.listing.seller.email}</p>
                  {reservation.listing.seller.phone && <p>{reservation.listing.seller.phone}</p>}
                </div>

                <div>
                  <span className="font-medium text-gray-600">Seller Rating:</span>
                  <p className="mt-1">
                    ⭐{" "}
                    {reservation.listing.seller.sellerRatingAverage?.toFixed(1) ?? "—"}{" "}
                    ({reservation.listing.seller.sellerRatingCount ?? 0} reviews)
                  </p>
                </div>
              </div>

              {/* Chat with Seller Button */}
              <Link
                href={`/chat/${id}`}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Chat with Seller
              </Link>
            </div>
          )}
        </div>

        {/* Right Column - Timer (when unpaid) or QR Code/Verification (when paid) */}
        {!depositPaid && reservation.status === "PENDING" && isBuyer ? (
          <div className="space-y-6">
            {/* Payment Timer */}
            <PaymentCountdownTimer
              reservationCreatedAt={reservation.createdAt}
              reservationId={id}
              onExpired={() => {
                setTimerExpired(true);
                // Refetch to get updated status
                void refetchReservation();
                void refetchPaymentStatus();
              }}
            />

            {/* Payment Instructions */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Complete Your Reservation</h3>

              <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
                <li>Pay the deposit of ${reservation.depositAmount.toFixed(2)} CAD</li>
                <li>Receive your pickup QR code</li>
                <li>Pick up your items before the deadline</li>
                <li>Pay the remaining balance at pickup</li>
              </ol>

              <button
                className={`mt-6 w-full rounded-md px-4 py-3 text-sm font-medium ${
                  timerExpired
                    ? "cursor-not-allowed bg-gray-400 text-gray-200"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
                disabled={timerExpired}
                onClick={() => {
                  if (!timerExpired) {
                    router.push(`/payment/${id}`);
                  }
                }}
              >
                {timerExpired ? "Payment Time Expired" : t("reservation.payDeposit")}
              </button>
            </div>
          </div>
        ) : !depositPaid && reservation.status === "PENDING" && isSeller ? (
          <div className="space-y-6">
            {/* Waiting for Payment - Seller View */}
            <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-yellow-800">Awaiting Payment</h3>
              <p className="text-sm text-yellow-700">
                The buyer has not yet paid the deposit for this reservation.
                You will be notified once payment is complete.
              </p>
            </div>
          </div>
        ) : depositPaid && isBuyer ? (
          <div className="space-y-6">
            {/* QR Code - Buyer View */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold text-center">
                {t("reservation.qrCode")}
              </h3>

              <div className="flex justify-center">
                <QRCode
                  value={reservation.qrCodeHash}
                  size={300}
                  level="H"
                />
              </div>

              <div className="mt-6 rounded-lg bg-blue-50 p-4">
                <p className="text-center text-sm text-blue-900">
                  {t("reservation.pickupInstructions")}
                </p>
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Verification Code (backup):
                </p>
                <p className="mt-2 text-3xl font-bold tracking-widest text-gray-900">
                  {reservation.verificationCode}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Next Steps</h3>

              <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
                <li>
                  Show this QR code or verification code to the seller at pickup
                </li>
                <li>
                  Pay the balance of ${(reservation.totalPrice - reservation.depositAmount).toFixed(2)}{" "}
                  CAD in person
                </li>
                <li>Collect your items</li>
                <li>Rate your experience after pickup</li>
              </ol>
            </div>
          </div>
        ) : depositPaid && isSeller ? (
          <div className="space-y-6">
            {/* Verification Info - Seller View */}
            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold text-center">
                Verification Code
              </h3>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Ask the buyer for this code to verify pickup:
                </p>
                <p className="mt-4 text-4xl font-bold tracking-widest text-gray-900">
                  {reservation.verificationCode}
                </p>
              </div>

              <div className="mt-6 rounded-lg bg-green-50 p-4">
                <p className="text-center text-sm text-green-800">
                  Verify this code matches what the buyer shows you before handing over items
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <h3 className="mb-4 text-lg font-semibold">Pickup Instructions</h3>

              <ol className="list-inside list-decimal space-y-2 text-sm text-gray-700">
                <li>
                  Ask the buyer for their verification code or scan their QR code
                </li>
                <li>
                  Collect the balance of ${(reservation.totalPrice - reservation.depositAmount).toFixed(2)}{" "}
                  CAD from the buyer
                </li>
                <li>Hand over the items</li>
                <li>Rate your experience with the buyer</li>
              </ol>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
