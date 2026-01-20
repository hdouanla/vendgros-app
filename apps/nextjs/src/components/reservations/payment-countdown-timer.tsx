"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { env } from "~/env";

interface PaymentCountdownTimerProps {
  reservationCreatedAt: Date | string;
  reservationId: string;
  onExpired?: () => void;
}

export function PaymentCountdownTimer({
  reservationCreatedAt,
  reservationId,
  onExpired,
}: PaymentCountdownTimerProps) {
  const router = useRouter();
  const timeoutMinutes = env.NEXT_PUBLIC_RESERVATION_PAYMENT_TIMEOUT_MINUTES;

  const calculateTimeLeft = useCallback(() => {
    const createdAt = new Date(reservationCreatedAt).getTime();
    const deadline = createdAt + timeoutMinutes * 60 * 1000;
    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, expired: true };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, expired: false };
  }, [reservationCreatedAt, timeoutMinutes]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.expired) {
        clearInterval(timer);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, onExpired]);

  // Calculate progress percentage (for progress ring)
  const totalSeconds = timeoutMinutes * 60;
  const remainingSeconds = timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
  const progressPercent = (remainingSeconds / totalSeconds) * 100;

  // Determine urgency colors
  const getUrgencyColor = () => {
    if (timeLeft.expired) return "text-red-600";
    if (remainingSeconds <= 60) return "text-red-600"; // Last minute
    if (remainingSeconds <= 180) return "text-orange-500"; // Last 3 minutes
    return "text-gray-900";
  };

  const getProgressColor = () => {
    if (timeLeft.expired) return "stroke-red-600";
    if (remainingSeconds <= 60) return "stroke-red-600";
    if (remainingSeconds <= 180) return "stroke-orange-500";
    return "stroke-green-600";
  };

  const getBgColor = () => {
    if (timeLeft.expired) return "bg-red-50 border-red-200";
    if (remainingSeconds <= 60) return "bg-red-50 border-red-200";
    if (remainingSeconds <= 180) return "bg-orange-50 border-orange-200";
    return "bg-white border-gray-200";
  };

  if (timeLeft.expired) {
    return (
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6 text-center">
        <div className="mb-4">
          <span className="text-5xl font-bold tabular-nums text-red-600">
            00:00:00
          </span>
        </div>
        <h3 className="text-lg font-semibold text-red-800">
          Payment Time Expired
        </h3>
        <p className="mt-2 text-sm text-red-600">
          This reservation has been cancelled due to payment timeout.
        </p>
        <button
          onClick={() => router.push("/listings")}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Browse Listings
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border-2 p-6 ${getBgColor()}`}>
      <p className="mb-4 text-center text-sm font-medium text-gray-600">
        Time remaining to complete payment
      </p>

      {/* Progress ring and countdown side by side */}
      <div className="flex items-center justify-center gap-6">
        {/* Circular Progress Ring */}
        <div className="relative h-24 w-24 flex-shrink-0">
          <svg className="h-24 w-24 -rotate-90 transform">
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="48"
              cy="48"
              r="42"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={getProgressColor()}
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPercent / 100)}`}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
        </div>

        {/* Countdown numbers */}
        <div className="flex-shrink-0">
          <span className={`text-5xl font-bold tabular-nums ${getUrgencyColor()}`}>
            {String(timeLeft.hours).padStart(2, "0")}:
            {String(timeLeft.minutes).padStart(2, "0")}:
            {String(timeLeft.seconds).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Warning message */}
      {remainingSeconds <= 180 && !timeLeft.expired && (
        <div className="mt-4 rounded-md bg-yellow-100 p-3">
          <p className="text-center text-sm font-medium text-yellow-800">
            {remainingSeconds <= 60
              ? "Less than 1 minute left! Complete payment now."
              : "Hurry! Less than 3 minutes remaining."}
          </p>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-gray-500">
        Reservation will be automatically cancelled if payment is not completed in time.
      </p>
    </div>
  );
}
