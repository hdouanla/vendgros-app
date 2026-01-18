"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import Link from "next/link";

export default function MyReservationsPage() {
  const router = useRouter();

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: reservations, isLoading: reservationsLoading } =
    api.reservation.myReservations.useQuery(undefined, {
      enabled: !!session?.user,
    });

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=/reservations");
    return null;
  }

  const activeReservations = reservations?.filter(
    (r) => r.status === "CONFIRMED" || r.status === "PENDING",
  );
  const completedReservations = reservations?.filter(
    (r) => r.status === "COMPLETED",
  );
  const otherReservations = reservations?.filter(
    (r) =>
      r.status !== "CONFIRMED" &&
      r.status !== "PENDING" &&
      r.status !== "COMPLETED",
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Reservations</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage your reservations
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Active</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {activeReservations?.length || 0}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {completedReservations?.length || 0}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Total</p>
          <p className="mt-2 text-3xl font-bold text-gray-600">
            {reservations?.length || 0}
          </p>
        </div>
      </div>

      {reservationsLoading ? (
        <div className="py-12 text-center">
          <p className="text-gray-600">Loading reservations...</p>
        </div>
      ) : !reservations || reservations.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="text-gray-600">No reservations yet</p>
          <Link
            href="/listings/search"
            className="mt-4 inline-block text-green-600 hover:text-green-700"
          >
            Browse listings →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Reservations */}
          {activeReservations && activeReservations.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Active Reservations
              </h2>
              <div className="space-y-4">
                {activeReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {reservation.listing.title}
                          </h3>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              reservation.status === "CONFIRMED"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {reservation.status}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                          <div>
                            <span className="text-gray-600">Quantity:</span>
                            <p className="font-medium text-gray-900">
                              {reservation.quantityReserved} units
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Total Price:</span>
                            <p className="font-medium text-gray-900">
                              ${reservation.totalPrice.toFixed(2)} CAD
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Deposit Paid:</span>
                            <p className="font-medium text-green-600">
                              ${reservation.depositAmount.toFixed(2)} CAD
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Balance Due:</span>
                            <p className="text-lg font-bold text-gray-900">
                              $
                              {(
                                reservation.totalPrice -
                                reservation.depositAmount
                              ).toFixed(2)}{" "}
                              CAD
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 text-sm text-gray-600">
                          <span className="font-medium">Pickup by:</span>{" "}
                          {new Date(reservation.expiresAt).toLocaleString()}
                        </div>

                        {reservation.status === "PENDING" && (
                          <div className="mt-3 rounded-md bg-yellow-50 p-3">
                            <p className="text-sm text-yellow-800">
                              ⚠️ Payment pending - Complete your payment to confirm
                              this reservation
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="ml-6 flex flex-col gap-2">
                        <Link
                          href={`/reservations/${reservation.id}`}
                          className="whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                          View Details
                        </Link>
                        {reservation.status === "PENDING" && (
                          <Link
                            href={`/payment/${reservation.id}`}
                            className="whitespace-nowrap rounded-md border border-green-600 bg-white px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
                          >
                            Pay Deposit
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Reservations */}
          {completedReservations && completedReservations.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Completed
              </h2>
              <div className="space-y-4">
                {completedReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="rounded-lg bg-white p-6 shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {reservation.listing.title}
                          </h3>
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                            COMPLETED
                          </span>
                        </div>

                        <div className="mt-3 text-sm text-gray-600">
                          <span className="font-medium">Completed on:</span>{" "}
                          {reservation.completedAt
                            ? new Date(reservation.completedAt).toLocaleString()
                            : "N/A"}
                        </div>

                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Total Paid:</span> $
                          {reservation.totalPrice.toFixed(2)} CAD
                        </div>
                      </div>

                      <Link
                        href={`/reservations/${reservation.id}`}
                        className="ml-6 whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Reservations (Cancelled, No-show, etc.) */}
          {otherReservations && otherReservations.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Other
              </h2>
              <div className="space-y-4">
                {otherReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="rounded-lg bg-white p-6 shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {reservation.listing.title}
                          </h3>
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                            {reservation.status}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-gray-600">
                          Created: {new Date(reservation.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <Link
                        href={`/reservations/${reservation.id}`}
                        className="ml-6 whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
