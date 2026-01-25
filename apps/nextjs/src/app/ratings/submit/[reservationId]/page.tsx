"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

// Simple translation stub
const t = (key: string, params?: any) => {
  const translations: Record<string, string> = {
    "common.loading": "Loading...",
    "common.back": "Back",
    "errors.notFound": "Reservation not found",
    "rating.ratingSubmitted": "Rating Submitted!",
    "rating.ratingBlind": "Your rating will be visible to the other party only after both of you have submitted ratings",
    "rating.rateExperience": "Rate Your Experience",
    "rating.rateTransaction": "Help us build a trusted community by rating your transaction",
    "listing.itemTitle": "Item",
    "listing.quantity": "Quantity",
    "listing.seller": "Seller",
    "rating.stars": "Your Rating",
    "rating.comment": "Comment (Optional)",
    "rating.ratingWindow": `Ratings must be submitted within ${params?.days || 7} days of pickup completion`,
    "rating.submitRating": "Submit Rating",
  };
  return translations[key] || key;
};

export default function SubmitRatingPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = use(params);
  const router = useRouter();

  const [score, setScore] = useState(0);
  const [hoveredScore, setHoveredScore] = useState(0);
  const [comment, setComment] = useState("");

  const { data: reservation, isLoading } = api.reservation.getById.useQuery({
    id: reservationId,
  });

  const { data: existingRating } = api.rating.getForReservation.useQuery(
    {
      reservationId,
    },
    {
      enabled: !!reservation,
    },
  );

  const submitRating = api.rating.submit.useMutation({
    onSuccess: () => {
      router.push(`/reservations/${reservationId}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (score === 0) {
      alert("Please select a rating");
      return;
    }

    await submitRating.mutateAsync({
      reservationId,
      score,
      comment: comment.trim() || undefined,
    });
  };

  if (isLoading) {
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

  if (existingRating?.ownRating) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg bg-white p-8 text-center shadow-md">
          <div className="mb-4 text-6xl">✅</div>
          <h1 className="mb-2 text-2xl font-bold">{t("rating.ratingSubmitted")}</h1>
          <p className="mb-6 text-gray-600">{t("rating.ratingBlind")}</p>
          <button
            onClick={() => router.push(`/reservations/${reservationId}`)}
            className="rounded-md bg-green-600 px-6 py-2 text-white hover:bg-green-700"
          >
            {t("common.back")}
          </button>
        </div>
      </div>
    );
  }

  // Determine who the user is rating
  const isBuyer = true; // TODO: Get from session
  const ratingTarget = isBuyer ? "seller" : "buyer";
  const targetName = isBuyer
    ? reservation.listing.seller.email
    : reservation.listing.seller.email; // TODO: Get buyer name

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <svg
          className="mr-1 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        {t("common.back")}
      </button>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("rating.rateExperience")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("rating.rateTransaction")}
        </p>
      </div>

      {/* Transaction Summary */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold">Transaction Details</h2>
        <div className="space-y-2 text-sm">
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
              {isBuyer ? t("listing.seller") : "Buyer"}:
            </span>
            <span className="font-medium">{targetName}</span>
          </div>
        </div>
      </div>

      {/* Rating Form */}
      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-md">
        {/* Star Rating */}
        <div className="mb-6">
          <label className="mb-3 block text-lg font-semibold">
            {t("rating.stars")} *
          </label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setScore(star)}
                onMouseEnter={() => setHoveredScore(star)}
                onMouseLeave={() => setHoveredScore(0)}
                className="text-5xl transition-transform hover:scale-110 focus:outline-none"
              >
                {star <= (hoveredScore || score) ? (
                  <span className="text-yellow-400">⭐</span>
                ) : (
                  <span className="text-gray-300">☆</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-sm text-gray-600">
            {score === 0
              ? "Click to rate"
              : score === 1
                ? "Poor"
                : score === 2
                  ? "Fair"
                  : score === 3
                    ? "Good"
                    : score === 4
                      ? "Very Good"
                      : "Excellent"}
          </p>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label htmlFor="comment" className="mb-2 block text-lg font-semibold">
            {t("rating.comment")}
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="Share your experience (optional)"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t("rating.ratingBlind")}
          </p>
        </div>

        {/* Rating Window Notice */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
          <p>
            💡 {t("rating.ratingWindow", { days: "7" })}
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={score === 0 || submitRating.isPending}
          className="w-full rounded-md bg-green-600 px-6 py-3 text-lg font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitRating.isPending
            ? t("common.loading")
            : t("rating.submitRating")}
        </button>

        {submitRating.isError && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {submitRating.error.message}
          </div>
        )}
      </form>
    </div>
  );
}
