"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { env } from "~/env";

interface PendingReservation {
  id: string;
  createdAt: Date;
  depositAmount: number;
  listing: {
    id: string;
    title: string;
  };
}

export function PendingPaymentAlert() {
  const t = useTranslations("reservation");
  const tCommon = useTranslations("common");
  const timeoutMinutes = env.NEXT_PUBLIC_RESERVATION_PAYMENT_TIMEOUT_MINUTES;

  const { data: pendingReservations } = api.reservation.getPendingPayments.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiringReservation, setExpiringReservation] = useState<PendingReservation | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [countdown, setCountdown] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Update current time every second for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate payment deadline from createdAt
  const getPaymentDeadline = useCallback((createdAt: Date): number => {
    return new Date(createdAt).getTime() + timeoutMinutes * 60 * 1000;
  }, [timeoutMinutes]);

  // Format time remaining (minutes only)
  const formatTimeRemaining = useCallback((createdAt: Date): string => {
    const deadline = getPaymentDeadline(createdAt);
    const diff = deadline - currentTime;

    if (diff <= 0) return "0 min";

    const minutes = Math.ceil(diff / 60000); // Round up to show at least 1 min

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }

    return `${minutes} min`;
  }, [currentTime, getPaymentDeadline]);

  // Check for reservations about to expire (3 minutes or less)
  useEffect(() => {
    if (!pendingReservations || pendingReservations.length === 0) return;

    const checkExpiry = () => {
      const threeMinutes = 3 * 60 * 1000;

      for (const reservation of pendingReservations) {
        const deadline = getPaymentDeadline(reservation.createdAt);
        const timeLeft = deadline - currentTime;

        // If less than 3 minutes and not already dismissed
        if (timeLeft > 0 && timeLeft <= threeMinutes && !dismissedIds.has(reservation.id)) {
          setExpiringReservation(reservation as PendingReservation);
          setShowExpiryModal(true);
          break;
        }
      }
    };

    checkExpiry();
  }, [pendingReservations, dismissedIds, currentTime, getPaymentDeadline]);

  // Update countdown timer for modal
  useEffect(() => {
    if (!expiringReservation || !showExpiryModal) return;
    setCountdown(formatTimeRemaining(expiringReservation.createdAt));
  }, [expiringReservation, showExpiryModal, formatTimeRemaining, currentTime]);

  const handleDismiss = () => {
    if (expiringReservation) {
      setDismissedIds((prev) => new Set(prev).add(expiringReservation.id));
    }
    setShowExpiryModal(false);
    setExpiringReservation(null);
  };

  if (!pendingReservations || pendingReservations.length === 0) {
    return null;
  }

  // Get the most urgent reservation (soonest to expire)
  const urgentReservation = pendingReservations[0] as PendingReservation;
  const timeRemaining = formatTimeRemaining(urgentReservation.createdAt);
  const hasMultiple = pendingReservations.length > 1;

  // If only 1 reservation, go to payment page; if multiple, go to reservations page
  const linkHref = hasMultiple
    ? "/reservations"
    : `/payment/${urgentReservation.id}`;

  return (
    <>
      {/* Navbar notification badge */}
      <Link
        href={linkHref}
        className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="hidden animate-pulse sm:inline">{t("pendingPayment")}</span>
        <span className="animate-pulse rounded bg-white/20 px-2 py-0.5 font-mono text-xs font-bold">
          {timeRemaining}
        </span>
        {hasMultiple && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-red-600">
            {pendingReservations.length}
          </span>
        )}
      </Link>

      {/* Expiry warning modal */}
      {showExpiryModal && expiringReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
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
            </div>

            <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
              {t("reservationExpiring")}
            </h2>

            <p className="mb-4 text-center text-gray-600">
              {t("reservationExpiringDesc", { title: expiringReservation.listing.title })}
            </p>

            <div className="mb-6 flex items-center justify-center">
              <div className="rounded-lg bg-red-50 px-6 py-3">
                <p className="text-center text-sm text-red-600">{t("timeRemaining")}</p>
                <p className="text-center font-mono text-3xl font-bold text-red-700">
                  {countdown}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                {t("remindLater")}
              </button>
              <Link
                href={`/payment/${expiringReservation.id}`}
                onClick={() => setShowExpiryModal(false)}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-green-700"
              >
                {t("payNow")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
