"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import Link from "next/link";
import { RatingModal } from "~/components/ratings/rating-modal";
import { useQueryClient } from "@tanstack/react-query";

// Component to cancel a pending reservation
function CancelButton({ reservationId, onSuccess, t }: { reservationId: string; onSuccess: () => void; t: ReturnType<typeof useTranslations<"reservation">> }) {
  const [showModal, setShowModal] = useState(false);
  const tCommon = useTranslations("common");

  const cancelMutation = api.reservation.cancel.useMutation({
    onSuccess: () => {
      setShowModal(false);
      onSuccess();
    },
  });

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="whitespace-nowrap rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        {t("cancel")}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {t("cancelReservationTitle")}
            </h2>
            <p className="mb-6 text-gray-600">
              {t("cancelReservationMessage")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={cancelMutation.isPending}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={() => cancelMutation.mutate({ reservationId })}
                disabled={cancelMutation.isPending}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMutation.isPending ? t("cancelling") : t("confirmCancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Component to show rating status for a completed reservation
function RatingButton({ reservationId, sellerName, t }: { reservationId: string; sellerName: string; t: ReturnType<typeof useTranslations<"reservation">> }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const tCommon = useTranslations("common");
  const { data: ratingStatus, isLoading } = api.rating.getForReservation.useQuery(
    { reservationId },
  );

  if (isLoading) {
    return (
      <span className="inline-flex items-center rounded-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400">
        {tCommon("loading")}
      </span>
    );
  }

  if (ratingStatus?.ownRating) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
        ✓ {t("rated")} ({ratingStatus.ownRating.score}/5)
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center whitespace-nowrap rounded-md border-2 border-orange-500 bg-white px-4 py-2 text-sm font-medium text-orange-500 hover:bg-orange-50"
      >
        * {t("rateSeller")}
      </button>
      <RatingModal
        reservationId={reservationId}
        targetName={sellerName}
        targetRole="seller"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

export default function MyReservationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("reservation");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "other">("active");

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery(undefined, {
    refetchOnMount: true,
  });
  const { data: reservations, isLoading: reservationsLoading } =
    api.reservation.myReservations.useQuery(undefined, {
      enabled: !!session?.user,
      refetchOnMount: true,
      staleTime: 0,
    });

  // Handle redirect to signin if not authenticated
  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/auth/signin?callbackUrl=/reservations");
    }
  }, [sessionLoading, session, router]);

  if (sessionLoading || !session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">{tCommon("loading")}</p>
      </div>
    );
  }

  const activeReservations = reservations?.filter(
    (r) => r.status === "CONFIRMED" || r.status === "PENDING",
  ) || [];
  const completedReservations = reservations?.filter(
    (r) => r.status === "COMPLETED",
  ) || [];
  const otherReservations = reservations?.filter(
    (r) =>
      r.status !== "CONFIRMED" &&
      r.status !== "PENDING" &&
      r.status !== "COMPLETED",
  ) || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t("myReservations")}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("viewAndManage")}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">{t("active")}</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {activeReservations.length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">{t("completed")}</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {completedReservations.length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">{t("other")}</p>
          <p className="mt-2 text-3xl font-bold text-gray-600">
            {otherReservations.length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">{t("total")}</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">
            {reservations?.length || 0}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-4">
        <Link
          href="/"
          className="rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
        >
          {t("browseListings")}
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("active")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "active"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {t("active")} ({activeReservations.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "completed"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {t("completed")} ({completedReservations.length})
          </button>
          <button
            onClick={() => setActiveTab("other")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "other"
                ? "border-gray-600 text-gray-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {t("other")} ({otherReservations.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "active" ? (
        <div className="rounded-lg bg-white shadow">
          {reservationsLoading ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">{t("loadingReservations")}</p>
            </div>
          ) : activeReservations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">{t("noActiveReservations")}</p>
              <Link
                href="/"
                className="mt-4 inline-block text-green-600 hover:text-green-700"
              >
                {t("browseListings")} →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activeReservations.map((reservation) => (
                <div key={reservation.id} className="p-6 hover:bg-gray-50">
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

                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">{t("seller")}:</span>{" "}
                          {reservation.listing.seller?.name || reservation.listing.seller?.email || "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">{t("quantity")}:</span>{" "}
                          {reservation.quantityReserved} {t("units")}
                        </p>
                        <p>
                          <span className="font-medium">{t("totalPrice")}:</span>{" "}
                          ${reservation.totalPrice.toFixed(2)} CAD
                        </p>
                        <p>
                          <span className="font-medium">{t("depositPaid")}:</span>{" "}
                          ${reservation.depositAmount.toFixed(2)} CAD
                        </p>
                        <p>
                          <span className="font-medium">{t("balanceDue")}:</span>{" "}
                          <span className="text-lg font-bold text-green-600">
                            ${(reservation.totalPrice - reservation.depositAmount).toFixed(2)} CAD
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">{t("pickupBy", { date: "" })}:</span>{" "}
                          {new Date(reservation.expiresAt).toLocaleString()}
                        </p>
                      </div>

                      {reservation.status === "PENDING" && (
                        <div className="mt-3 rounded-md bg-yellow-50 p-3">
                          <p className="text-sm text-yellow-800">
                            ⚠️ {t("paymentPending")}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 flex flex-col gap-2">
                      <Link
                        href={`/reservations/${reservation.id}`}
                        className="whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        {t("viewDetails")}
                      </Link>
                      {reservation.status === "PENDING" && (
                        <>
                          <Link
                            href={`/payment/${reservation.id}`}
                            className="whitespace-nowrap rounded-md border border-green-600 bg-white px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
                          >
                            {t("payDeposit")}
                          </Link>
                          <CancelButton
                            reservationId={reservation.id}
                            onSuccess={() => queryClient.invalidateQueries()}
                            t={t}
                          />
                        </>
                      )}
                      {reservation.status === "CONFIRMED" && (
                        <Link
                          href={`/chat/${reservation.id}`}
                          className="flex items-center justify-center gap-1 whitespace-nowrap rounded-md border border-green-600 bg-white px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {t("chat")}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "completed" ? (
        <div className="rounded-lg bg-white shadow">
          {reservationsLoading ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">{t("loadingCompletedReservations")}</p>
            </div>
          ) : completedReservations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">{t("noCompletedReservations")}</p>
              <p className="mt-2 text-sm text-gray-500">
                {t("completedOrdersAppear")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {completedReservations.map((reservation) => (
                <div key={reservation.id} className="p-6 hover:bg-gray-50">
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

                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">{t("seller")}:</span>{" "}
                          {reservation.listing.seller?.name || reservation.listing.seller?.email || "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">{t("quantity")}:</span>{" "}
                          {reservation.quantityReserved} {t("units")}
                        </p>
                        <p>
                          <span className="font-medium">{t("totalPaid")}:</span>{" "}
                          <span className="text-lg font-bold text-green-600">
                            ${reservation.totalPrice.toFixed(2)} CAD
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">{t("completed")}:</span>{" "}
                          {reservation.completedAt
                            ? new Date(reservation.completedAt).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="ml-6 flex flex-col gap-2">
                      <Link
                        href={`/chat/${reservation.id}`}
                        className="flex items-center justify-center gap-1 whitespace-nowrap rounded-md border border-green-600 bg-white px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {t("chat")}
                      </Link>
                      <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                        ✓ {t("delivered")}
                      </span>
                      <RatingButton
                        reservationId={reservation.id}
                        sellerName={reservation.listing.seller?.name || reservation.listing.seller?.email || "Seller"}
                        t={t}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow">
          {reservationsLoading ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">{t("loadingReservations")}</p>
            </div>
          ) : otherReservations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-600">{t("noOtherReservations")}</p>
              <p className="mt-2 text-sm text-gray-500">
                {t("cancelledExpiredAppear")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {otherReservations.map((reservation) => (
                <div key={reservation.id} className="p-6 hover:bg-gray-50">
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

                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">{t("seller")}:</span>{" "}
                          {reservation.listing.seller?.name || reservation.listing.seller?.email || "N/A"}
                        </p>
                        <p>
                          <span className="font-medium">{t("quantity")}:</span>{" "}
                          {reservation.quantityReserved} {t("units")}
                        </p>
                        <p>
                          <span className="font-medium">{t("totalPrice")}:</span>{" "}
                          ${reservation.totalPrice.toFixed(2)} CAD
                        </p>
                        <p>
                          <span className="font-medium">Created:</span>{" "}
                          {new Date(reservation.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="ml-6 flex flex-col gap-2">
                      <Link
                        href={`/reservations/${reservation.id}`}
                        className="whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {t("viewDetails")}
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
