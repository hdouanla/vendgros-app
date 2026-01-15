"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ListingMap } from "~/components/map/listing-map";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations();
  const router = useRouter();

  const [quantityToReserve, setQuantityToReserve] = useState(1);
  const [showReserveModal, setShowReserveModal] = useState(false);

  const { data: listing, isLoading } = api.listing.getById.useQuery({
    id,
  });

  const createReservation = api.reservation.create.useMutation({
    onSuccess: (data) => {
      // Redirect to payment page to pay deposit
      router.push(`/payment/${data.id}`);
    },
  });

  const handleReserve = async () => {
    if (!listing) return;

    await createReservation.mutateAsync({
      listingId: id,
      quantityReserved: quantityToReserve,
    });
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("errors.notFound")}</p>
      </div>
    );
  }

  const depositAmount = listing.pricePerPiece * quantityToReserve * 0.05;
  const totalPrice = listing.pricePerPiece * quantityToReserve;
  const balanceDue = totalPrice - depositAmount;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Column - Images and Description */}
        <div className="space-y-6">
          {/* Main Image */}
          <div className="aspect-video overflow-hidden rounded-lg bg-gray-200">
            {listing.photos && listing.photos.length > 0 ? (
              <img
                src={listing.photos[0]}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                {t("listing.photos")}
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {listing.photos && listing.photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {listing.photos.slice(1, 5).map((photo, idx) => (
                <div
                  key={idx}
                  className="aspect-square overflow-hidden rounded-lg bg-gray-200"
                >
                  <img
                    src={photo}
                    alt={`Photo ${idx + 2}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {t("listing.description")}
            </h2>
            <p className="whitespace-pre-wrap text-gray-700">
              {listing.description}
            </p>
          </div>

          {/* Pickup Information */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {t("listing.pickupAddress")}
            </h2>
            <p className="mb-4 text-gray-700">{listing.pickupAddress}</p>

            {listing.pickupInstructions && (
              <>
                <h3 className="mb-2 font-medium">
                  {t("listing.pickupInstructions")}
                </h3>
                <p className="text-sm text-gray-600">
                  {listing.pickupInstructions}
                </p>
              </>
            )}

            {/* Map */}
            <div className="mt-4">
              <ListingMap
                listings={[
                  {
                    id: listing.id,
                    latitude: listing.latitude,
                    longitude: listing.longitude,
                    title: listing.title,
                    pricePerPiece: listing.pricePerPiece,
                    quantityAvailable: listing.quantityAvailable,
                    category: listing.category,
                  },
                ]}
                center={[listing.longitude, listing.latitude]}
                zoom={14}
                height="300px"
              />
            </div>
          </div>

          {/* Seller Information */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {t("listing.seller")}
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">
                  {t("profile.accountType")}:
                </span>{" "}
                {listing.seller.userType}
              </div>
              <div>
                <span className="font-medium text-gray-600">
                  {t("listing.rating")}:
                </span>{" "}
                ⭐ {listing.seller.ratingAverage?.toFixed(1) ?? "—"} (
                {listing.seller.ratingCount} {t("listing.reviews")})
              </div>
              <div>
                <span className="font-medium text-gray-600">
                  {t("profile.memberSince")}:
                </span>{" "}
                {new Date(listing.seller.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Purchase Card */}
        <div>
          <div className="sticky top-8 rounded-lg bg-white p-6 shadow-lg">
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              {listing.title}
            </h1>

            <div className="mb-4 flex items-center gap-2">
              <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {listing.category}
              </span>
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                  listing.status === "PUBLISHED"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {listing.status}
              </span>
            </div>

            <div className="mb-6 border-t border-b py-4">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-green-600">
                  ${listing.pricePerPiece.toFixed(2)}
                </span>
                <span className="text-sm text-gray-600">
                  / {t("listing.pricePerPiece")}
                </span>
              </div>

              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>{t("listing.quantityAvailable")}:</span>
                  <span className="font-medium">
                    {listing.quantityAvailable} units
                  </span>
                </div>
                {listing.maxPerBuyer && (
                  <div className="flex justify-between">
                    <span>{t("listing.maxPerBuyer")}:</span>
                    <span className="font-medium">
                      {listing.maxPerBuyer} units
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-4">
              <label
                htmlFor="quantity"
                className="mb-2 block text-sm font-medium"
              >
                {t("listing.quantity")}
              </label>
              <input
                type="number"
                id="quantity"
                value={quantityToReserve}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val > 0 && val <= listing.quantityAvailable) {
                    if (listing.maxPerBuyer && val > listing.maxPerBuyer) {
                      setQuantityToReserve(listing.maxPerBuyer);
                    } else {
                      setQuantityToReserve(val);
                    }
                  }
                }}
                min="1"
                max={
                  listing.maxPerBuyer
                    ? Math.min(listing.maxPerBuyer, listing.quantityAvailable)
                    : listing.quantityAvailable
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              />
            </div>

            {/* Price Breakdown */}
            <div className="mb-6 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("reservation.totalPrice")}:</span>
                <span className="font-medium">
                  ${totalPrice.toFixed(2)} CAD
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">
                  {t("reservation.depositAmount")}:
                </span>
                <span className="font-medium text-green-600">
                  ${depositAmount.toFixed(2)} CAD
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>{t("reservation.balanceDue")}:</span>
                <span>${balanceDue.toFixed(2)} CAD</span>
              </div>
            </div>

            {/* Reserve Button */}
            <button
              onClick={() => setShowReserveModal(true)}
              disabled={
                listing.status !== "PUBLISHED" ||
                listing.quantityAvailable === 0
              }
              className="w-full rounded-md bg-green-600 px-6 py-3 text-lg font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {listing.quantityAvailable === 0
                ? "Out of Stock"
                : t("reservation.reserve")}
            </button>

            <p className="mt-3 text-center text-xs text-gray-500">
              {t("reservation.balancePayment", {
                amount: balanceDue.toFixed(2),
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Reservation Confirmation Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">
              {t("reservation.confirmReservation")}
            </h2>

            <div className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t("listing.itemTitle")}:</span>
                <span className="font-medium">{listing.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t("listing.quantity")}:</span>
                <span className="font-medium">{quantityToReserve} units</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">
                  {t("reservation.depositAmount")}:
                </span>
                <span className="font-medium text-green-600">
                  ${depositAmount.toFixed(2)} CAD
                </span>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-600">
              You'll be redirected to payment to secure your reservation. The
              remaining ${balanceDue.toFixed(2)} CAD will be paid at pickup.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowReserveModal(false)}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleReserve}
                disabled={createReservation.isPending}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {createReservation.isPending
                  ? t("common.loading")
                  : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
