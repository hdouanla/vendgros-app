"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import Link from "next/link";

export default function SellerDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"listings" | "reservations" | "completed">("listings");

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();

  // Handle redirect to signin if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/auth/signin?callbackUrl=/seller");
    }
  }, [sessionLoading, session, router]);

  // Fetch seller's listings
  const { data: listings, isLoading: listingsLoading } = api.listing.myListings.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    }
  );

  // Fetch pending reservations (awaiting pickup)
  const { data: pendingReservations, isLoading: reservationsLoading } =
    api.reservation.getPendingPickups.useQuery(undefined, {
      enabled: !!session?.user,
    });

  // Fetch completed reservations (delivered orders)
  const { data: completedReservations, isLoading: completedLoading } =
    api.reservation.getCompletedPickups.useQuery(undefined, {
      enabled: !!session?.user,
    });

  if (sessionLoading || !session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const activeListings = listings?.filter((l) => l.status === "PUBLISHED") || [];
  const draftListings = listings?.filter((l) => l.status === "DRAFT") || [];
  const pendingReviewListings = listings?.filter((l) => l.status === "PENDING_REVIEW") || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your listings and reservations
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Active Listings</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {activeListings.length}
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Pending Review</p>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {pendingReviewListings.length}
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Awaiting Pickup</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {pendingReservations?.length || 0}
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">
            {completedReservations?.length || 0}
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Drafts</p>
          <p className="mt-2 text-3xl font-bold text-gray-600">
            {draftListings.length}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-4">
        <Link
          href="/listings/create"
          className="rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
        >
          + Create New Listing
        </Link>
        <Link
          href="/seller/scanner"
          className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          📱 Scan QR Code
        </Link>
        <Link
          href="/seller/analytics"
          className="rounded-md bg-purple-600 px-6 py-3 text-sm font-medium text-white hover:bg-purple-700"
        >
          📊 View Analytics
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("listings")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "listings"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            My Listings ({listings?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("reservations")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "reservations"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Pending Pickups ({pendingReservations?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "completed"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Completed ({completedReservations?.length || 0})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "completed" ? (
        <div className="rounded-lg bg-white shadow">
          {completedLoading ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">Loading completed orders...</p>
            </div>
          ) : !completedReservations || completedReservations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">No completed orders yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Orders will appear here after successful pickup
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Buyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {completedReservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {reservation.listing.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            Code: {reservation.verificationCode}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">
                            {reservation.buyer.name || reservation.buyer.email}
                          </p>
                          {reservation.buyer.name && (
                            <p className="text-xs text-gray-500">
                              {reservation.buyer.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {reservation.quantityReserved} units
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-600">
                        ${reservation.totalPrice.toFixed(2)} CAD
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {reservation.completedAt
                          ? new Date(reservation.completedAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === "listings" ? (
        <div className="rounded-lg bg-white shadow">
          {listingsLoading ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">Loading listings...</p>
            </div>
          ) : !listings || listings.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">No listings yet</p>
              <Link
                href="/listings/create"
                className="mt-4 inline-block text-green-600 hover:text-green-700"
              >
                Create your first listing →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Listing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Available
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Views
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {listings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                            {listing.photos && listing.photos.length > 0 ? (
                              <img
                                src={listing.photos[0]}
                                alt={listing.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-gray-400">
                                📦
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {listing.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {listing.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                              listing.status === "PUBLISHED"
                                ? "bg-green-100 text-green-800"
                                : listing.status === "PENDING_REVIEW"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : listing.status === "DRAFT" && listing.moderationNotes
                                    ? "bg-red-100 text-red-800"
                                    : listing.status === "DRAFT"
                                      ? "bg-gray-100 text-gray-800"
                                      : "bg-red-100 text-red-800"
                            }`}
                          >
                            {listing.status === "DRAFT" && listing.moderationNotes
                              ? "REJECTED"
                              : listing.status}
                          </span>
                          {/* Show rejection reason for DRAFT listings with moderation notes */}
                          {listing.status === "DRAFT" && listing.moderationNotes && (
                            <div className="mt-1 max-w-xs">
                              <p className="text-xs font-medium text-red-600">
                                Rejection reason:
                              </p>
                              <p className="text-xs text-red-600 line-clamp-2">
                                {listing.moderationNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        ${listing.pricePerPiece.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {listing.quantityAvailable} / {listing.quantityTotal}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {listing.viewCount}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/listings/${listing.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </Link>
                        <span className="mx-2 text-gray-300">|</span>
                        <Link
                          href={`/seller/listings/${listing.id}/edit`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow">
          {reservationsLoading ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">Loading reservations...</p>
            </div>
          ) : !pendingReservations || pendingReservations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">No pending pickups</p>
              <p className="mt-2 text-sm text-gray-500">
                Reservations will appear here when buyers pay their deposit
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pendingReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="p-6 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {reservation.listing.title}
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Buyer:</span>{" "}
                          {reservation.buyer.email}
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
                        <p>
                          <span className="font-medium">Balance Due:</span>{" "}
                          <span className="text-lg font-bold text-green-600">
                            $
                            {(
                              reservation.totalPrice - reservation.depositAmount
                            ).toFixed(2)}{" "}
                            CAD
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">Pickup Deadline:</span>{" "}
                          {new Date(reservation.expiresAt).toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">Code:</span>{" "}
                          <span className="font-mono text-lg font-bold text-gray-900">
                            {reservation.verificationCode}
                          </span>
                        </p>
                      </div>
                    </div>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
