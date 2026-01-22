"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { RatingModal } from "~/components/ratings/rating-modal";

interface ReservationCardProps {
  reservation: {
    id: string;
    verificationCode: string;
    quantityReserved: number;
    totalPrice: number;
    depositAmount: number;
    expiresAt?: Date | string;
    completedAt?: Date | string | null;
    listing: {
      title: string;
    };
    buyer: {
      email: string;
      name?: string | null;
    };
  };
  variant: "pending" | "completed";
}

export function ReservationCard({ reservation, variant }: ReservationCardProps) {
  const isPending = variant === "pending";
  const balanceDue = reservation.totalPrice - reservation.depositAmount;
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  // Check if seller has already rated this buyer (for completed reservations)
  const { data: ratingStatus } = api.rating.getForReservation.useQuery(
    { reservationId: reservation.id },
    { enabled: !isPending },
  );

  const buyerName = reservation.buyer.name || reservation.buyer.email;

  return (
    <>
      <div className="p-6 hover:bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {reservation.listing.title}
            </h3>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Buyer:</span> {buyerName}
              </p>
              <p>
                <span className="font-medium">Quantity:</span>{" "}
                {reservation.quantityReserved} units
              </p>
              <p>
                <span className="font-medium">Total Price:</span>{" "}
                ${reservation.totalPrice.toFixed(2)} CAD
              </p>
              <p>
                <span className="font-medium">Deposit Paid:</span>{" "}
                ${reservation.depositAmount.toFixed(2)} CAD
              </p>
              {isPending ? (
                <p>
                  <span className="font-medium">Balance Due:</span>{" "}
                  <span className="text-lg font-bold text-green-600">
                    ${balanceDue.toFixed(2)} CAD
                  </span>
                </p>
              ) : (
                <p>
                  <span className="font-medium">Total Collected:</span>{" "}
                  <span className="text-lg font-bold text-green-600">
                    ${reservation.totalPrice.toFixed(2)} CAD
                  </span>
                </p>
              )}
              {isPending && reservation.expiresAt && (
                <p>
                  <span className="font-medium">Pickup Deadline:</span>{" "}
                  {new Date(reservation.expiresAt).toLocaleString()}
                </p>
              )}
              {!isPending && reservation.completedAt && (
                <p>
                  <span className="font-medium">Completed:</span>{" "}
                  {new Date(reservation.completedAt).toLocaleString()}
                </p>
              )}
              <p>
                <span className="font-medium">Code:</span>{" "}
                <span className="font-mono text-lg font-bold text-gray-900">
                  {reservation.verificationCode}
                </span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="ml-6 flex flex-col gap-2">
            {isPending && (
              <>
                <Link
                  href={`/seller/scanner?code=${reservation.verificationCode}`}
                  className="whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Scan QR Code
                </Link>
                <Link
                  href={`/reservations/${reservation.id}`}
                  className="whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  View Details
                </Link>
              </>
            )}

            {/* Chat with Buyer button - available for both pending and completed */}
            <Link
              href={`/chat/${reservation.id}`}
              className="flex items-center justify-center gap-1 whitespace-nowrap rounded-md border border-green-600 bg-white px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Chat
            </Link>

            {/* Completed badge for completed reservations */}
            {!isPending && (
              <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                ✓ Delivered
              </span>
            )}

            {/* Rate buyer button for completed reservations */}
            {!isPending && (
              ratingStatus?.myRating ? (
                <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
                  ✓ Rated ({ratingStatus.myRating.score}/5)
                </span>
              ) : (
                <button
                  onClick={() => setIsRatingModalOpen(true)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md border-2 border-orange-500 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-50"
                >
                  * Rate this buyer
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      <RatingModal
        reservationId={reservation.id}
        targetName={buyerName}
        targetRole="buyer"
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
      />
    </>
  );
}
