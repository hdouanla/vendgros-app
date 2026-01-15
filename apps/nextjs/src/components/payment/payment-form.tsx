"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { api } from "~/trpc/react";

interface PaymentFormProps {
  reservationId: string;
  amount: number;
}

export function PaymentForm({ reservationId, amount }: PaymentFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const verifyPayment = api.payment.verifyPayment.useMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        setMessage(error.message || "An error occurred");
        setIsLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Verify payment on backend
        await verifyPayment.mutateAsync({
          paymentIntentId: paymentIntent.id,
        });

        setMessage(t("payment.paymentSuccessful"));

        // Redirect to reservation page after short delay
        setTimeout(() => {
          router.push(`/reservations/${reservationId}`);
        }, 1500);
      }
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : t("payment.paymentFailed")
      );
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">
          {t("payment.paymentMethod")}
        </h3>
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {/* Payment Button */}
      <button
        disabled={isLoading || !stripe || !elements}
        type="submit"
        className="w-full rounded-md bg-green-600 px-6 py-3 text-lg font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg
              className="mr-2 h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {t("payment.processing")}
          </span>
        ) : (
          `${t("payment.payNow")} - $${amount.toFixed(2)} CAD`
        )}
      </button>

      {/* Payment Message */}
      {message && (
        <div
          className={`rounded-md p-4 text-sm ${
            message.includes("successful") || message.includes("Successful")
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Help Text */}
      <div className="text-center text-xs text-gray-500">
        <p>
          By confirming your payment, you agree to complete pickup within 48
          hours
        </p>
      </div>
    </form>
  );
}
