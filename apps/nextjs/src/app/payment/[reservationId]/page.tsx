"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentForm } from "~/components/payment/payment-form";
import { PaymentCountdownTimer } from "~/components/reservations/payment-countdown-timer";

// Simple translation stub - replace with actual translations later
const t = (key: string, params?: any) => {
  const translations: Record<string, string> = {
    "common.loading": "Loading...",
    "common.cancel": "Cancel",
    "errors.notFound": "Reservation not found",
    "payment.payment": "Payment",
    "payment.securePayment": "Secure Payment",
    "payment.processing": "Processing...",
    "listing.itemTitle": "Item",
    "listing.quantity": "Quantity",
    "listing.pricePerPiece": "Price per piece",
    "reservation.totalPrice": "Total Price",
    "reservation.depositAmount": "Deposit (5%)",
    "reservation.balanceDue": "Balance Due at Pickup",
    "reservation.balancePayment": `Pay remaining balance at pickup`,
    "reservation.cancelReservation": "Cancel Reservation",
    "reservation.cancelConfirmTitle": "Cancel this reservation?",
    "reservation.cancelConfirmMessage": "Are you sure you want to cancel? This action cannot be undone.",
    "reservation.cancelling": "Cancelling...",
  };
  return translations[key] || key;
};

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function PaymentPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = use(params);
  const router = useRouter();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const cancelReservation = api.reservation.cancel.useMutation({
    onSuccess: () => {
      router.push("/reservations");
    },
  });

  const { data: reservation, isLoading: reservationLoading, isError } =
    api.reservation.getById.useQuery({
      id: reservationId,
    });

  const { data: paymentStatus } = api.payment.getPaymentStatus.useQuery(
    {
      reservationId,
    },
    {
      enabled: !!reservation,
    },
  );

  const createPaymentIntent = api.payment.createDepositPayment.useMutation({
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
  });

  useEffect(() => {
    if (reservation && !paymentStatus?.depositPaid && !clientSecret) {
      // Create payment intent automatically
      createPaymentIntent.mutate({
        reservationId,
      });
    }
  }, [reservation, paymentStatus, clientSecret]);

  // Redirect if already paid
  useEffect(() => {
    if (paymentStatus?.depositPaid) {
      router.push(`/reservations/${reservationId}`);
    }
  }, [paymentStatus, reservationId, router]);

  // Redirect to home if reservation not found
  useEffect(() => {
    if (!reservationLoading && (!reservation || isError)) {
      router.push("/");
    }
  }, [reservationLoading, reservation, isError, router]);

  if (reservationLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  const options = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: "stripe" as const,
      variables: {
        colorPrimary: "#059669", // green-600
        colorBackground: "#ffffff",
        colorText: "#1f2937",
        colorDanger: "#dc2626",
        fontFamily: "system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "6px",
      },
    },
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("payment.payment")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("payment.securePayment")}
        </p>
      </div>

      {/* Order Summary */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold">Order Summary</h2>

        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium text-gray-600">
              {t("listing.itemTitle")}:
            </span>
            <p className="mt-1">{reservation.listing.title}</p>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">{t("listing.quantity")}:</span>
            <span className="font-medium">
              {reservation.quantityReserved} units
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">
              {t("listing.pricePerPiece")}:
            </span>
            <span className="font-medium">
              ${(reservation.listing.pricePerPiece * 1.05).toFixed(2)} CAD
            </span>
          </div>

          <div className="flex justify-between border-t pt-3">
            <span className="text-gray-600">{t("reservation.totalPrice")}:</span>
            <span className="font-medium">
              ${(reservation.totalPrice * 1.05).toFixed(2)} CAD
            </span>
          </div>

          <div className="flex justify-between border-t pt-3">
            <span className="text-lg font-semibold">
              {t("reservation.depositAmount")}:
            </span>
            <span className="text-lg font-bold text-green-600">
              ${reservation.depositAmount.toFixed(2)} CAD
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">
              {t("reservation.balanceDue")}:
            </span>
            <span className="font-medium">
              ${reservation.totalPrice.toFixed(2)} CAD
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
          <p>
            💡 {t("reservation.balancePayment")} (${reservation.totalPrice.toFixed(2)} CAD)
          </p>
        </div>
      </div>

      {/* Payment Timer */}
      <div className="mb-8">
        <PaymentCountdownTimer
          reservationCreatedAt={reservation.createdAt}
          reservationId={reservationId}
          onExpired={() => {
            // Redirect to reservations page when expired
            router.push(`/reservations/${reservationId}`);
          }}
        />
      </div>

      {/* Payment Form */}
      {!clientSecret ? (
        <div className="rounded-lg bg-white p-8 text-center shadow-md">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent"></div>
          <p className="text-gray-600">{t("payment.processing")}</p>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm
              reservationId={reservationId}
              amount={reservation.depositAmount}
            />
          </Elements>
        </div>
      )}

      {/* Security Notice */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          🔒 {t("payment.securePayment")}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Your payment information is encrypted and secure
        </p>
      </div>

      {/* Cancel Button */}
      <div className="mt-8 text-center">
        <button
          onClick={() => setShowCancelModal(true)}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          {t("reservation.cancelReservation")}
        </button>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {t("reservation.cancelConfirmTitle")}
            </h2>
            <p className="mb-6 text-gray-600">
              {t("reservation.cancelConfirmMessage")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelReservation.isPending}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => cancelReservation.mutate({ reservationId })}
                disabled={cancelReservation.isPending}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelReservation.isPending
                  ? t("reservation.cancelling")
                  : t("reservation.cancelReservation")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
