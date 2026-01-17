"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentForm } from "~/components/payment/payment-form";

// Simple translation stub - replace with actual translations later
const t = (key: string, params?: any) => {
  const translations: Record<string, string> = {
    "common.loading": "Loading...",
    "errors.notFound": "Reservation not found",
    "payment.payment": "Payment",
    "payment.securePayment": "Secure Payment",
    "payment.processing": "Processing...",
    "listing.itemTitle": "Item",
    "listing.quantity": "Quantity",
    "listing.pricePerPiece": "Price per piece",
    "reservation.totalPrice": "Total Price",
    "reservation.depositAmount": "Deposit Amount (5%)",
    "reservation.balancePayment": `Pay remaining balance at pickup`,
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

  const { data: reservation, isLoading: reservationLoading } =
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
        <p className="text-gray-600">{t("errors.notFound")}</p>
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
              ${reservation.listing.pricePerPiece.toFixed(2)} CAD
            </span>
          </div>

          <div className="flex justify-between border-t pt-3">
            <span className="text-gray-600">{t("reservation.totalPrice")}:</span>
            <span className="font-medium">
              ${reservation.totalPrice.toFixed(2)} CAD
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
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
          <p>
            💡 {t("reservation.balancePayment", {
              amount: (
                reservation.totalPrice - reservation.depositAmount
              ).toFixed(2),
            })}
          </p>
        </div>
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
    </div>
  );
}
