"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { env } from "~/env";
import Link from "next/link";

interface InlinePaymentCountdownProps {
  reservationCreatedAt: Date | string;
  reservationId: string;
}

export function InlinePaymentCountdown({
  reservationCreatedAt,
  reservationId,
}: InlinePaymentCountdownProps) {
  const t = useTranslations("reservation");
  const timeoutMinutes = env.NEXT_PUBLIC_RESERVATION_PAYMENT_TIMEOUT_MINUTES;

  const calculateTimeLeft = useCallback(() => {
    const createdAt = new Date(reservationCreatedAt).getTime();
    const deadline = createdAt + timeoutMinutes * 60 * 1000;
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) {
      return { minutes: 0, seconds: 0, expired: true, totalSeconds: 0 };
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { minutes, seconds, expired: false, totalSeconds: diff / 1000 };
  }, [reservationCreatedAt, timeoutMinutes]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  // Determine urgency colors
  const getColorClasses = () => {
    if (timeLeft.expired) return "bg-red-100 text-red-700 border-red-300";
    if (timeLeft.totalSeconds <= 60) return "bg-red-100 text-red-700 border-red-300";
    if (timeLeft.totalSeconds <= 180) return "bg-orange-100 text-orange-700 border-orange-300";
    return "bg-yellow-100 text-yellow-700 border-yellow-300";
  };

  const getIconColor = () => {
    if (timeLeft.expired) return "text-red-600";
    if (timeLeft.totalSeconds <= 60) return "text-red-600";
    if (timeLeft.totalSeconds <= 180) return "text-orange-500";
    return "text-yellow-600";
  };

  if (timeLeft.expired) {
    return (
      <div className={`flex items-center gap-2 rounded-md border px-3 py-2 ${getColorClasses()}`}>
        <svg className={`h-5 w-5 ${getIconColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium">{t("paymentTimeExpired")}</span>
      </div>
    );
  }

  const timeString = `${String(timeLeft.minutes).padStart(2, "0")}:${String(timeLeft.seconds).padStart(2, "0")}`;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${getColorClasses()}`}>
      <div className="flex items-center gap-2">
        <svg className={`h-5 w-5 animate-pulse ${getIconColor()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium">
          {t("paymentDueIn")}{" "}
          <span className="font-mono font-bold">{timeString}</span>
        </span>
      </div>
      <Link
        href={`/payment/${reservationId}`}
        className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
      >
        {t("payNow")}
      </Link>
    </div>
  );
}
