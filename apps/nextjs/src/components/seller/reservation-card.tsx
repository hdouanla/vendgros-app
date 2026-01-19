"use client";

import Link from "next/link";

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

  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {reservation.listing.title}
          </h3>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium">Buyer:</span>{" "}
              {reservation.buyer.name || reservation.buyer.email}
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

        {/* Actions - only show for pending reservations */}
        {isPending && (
          <div className="ml-6 flex flex-col gap-2">
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
          </div>
        )}

        {/* Completed badge for completed reservations */}
        {!isPending && (
          <div className="ml-6">
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              ✓ Delivered
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
