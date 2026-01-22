"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

interface RatingModalProps {
  reservationId: string;
  targetName: string;
  targetRole: "buyer" | "seller";
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RatingModal({
  reservationId,
  targetName,
  targetRole,
  isOpen,
  onClose,
  onSuccess,
}: RatingModalProps) {
  const [score, setScore] = useState(0);
  const [hoveredScore, setHoveredScore] = useState(0);
  const [comment, setComment] = useState("");

  const utils = api.useUtils();

  const submitRating = api.rating.submit.useMutation({
    onSuccess: () => {
      // Invalidate rating queries to refresh the UI
      void utils.rating.getForReservation.invalidate({ reservationId });
      onSuccess?.();
      onClose();
      // Reset form
      setScore(0);
      setComment("");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (score === 0) {
      return;
    }

    await submitRating.mutateAsync({
      reservationId,
      score,
      comment: comment.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">⭐</div>
          <h2 className="text-xl font-bold text-gray-900">
            Rate this {targetRole}
          </h2>
          <p className="mt-1 text-sm text-gray-600">{targetName}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div className="mb-6">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setScore(star)}
                  onMouseEnter={() => setHoveredScore(star)}
                  onMouseLeave={() => setHoveredScore(0)}
                  className="text-4xl transition-transform hover:scale-110 focus:outline-none"
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
              {score === 0 ? "Click to rate" : ratingLabels[score]}
            </p>
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label htmlFor="comment" className="mb-1 block text-sm font-medium text-gray-700">
              Comment (Optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              placeholder="Share your experience..."
            />
          </div>

          {/* Blind rating notice */}
          <div className="mb-4 rounded-md bg-blue-50 p-3 text-xs text-blue-800">
            Your rating will be visible only after both parties have submitted their ratings.
          </div>

          {/* Error message */}
          {submitRating.isError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              {submitRating.error.message}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={score === 0 || submitRating.isPending}
              className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitRating.isPending ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
