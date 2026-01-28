"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import Link from "next/link";
import { ImageLightbox } from "~/components/ui/image-lightbox";
import { LikeButton } from "~/components/listings/like-button";
import { FavoriteButton } from "~/components/listings/favorite-button";
import { ListingCard } from "~/components/listings/listing-card";
import { useLastVisited } from "~/hooks/use-last-visited";
import { getStorageUrl } from "~/lib/storage";

// Star rating display component
function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <span className="inline-flex text-yellow-400">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`}>★</span>
      ))}
      {hasHalfStar && <span>★</span>}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className="text-gray-300">
          ★
        </span>
      ))}
    </span>
  );
}

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const tCommon = useTranslations("common");
  const tListing = useTranslations("listing");
  const tReservation = useTranslations("reservation");
  const tProfile = useTranslations("profile");
  const tErrors = useTranslations("errors");

  const [quantityToReserve, setQuantityToReserve] = useState(1);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showMinDepositModal, setShowMinDepositModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const { data: session } = api.auth.getSession.useQuery();
  const { data: phoneStatus } = api.phoneVerification.getStatus.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  const { data: listing, isLoading } = api.listing.getById.useQuery({ id });

  // Update quantity when listing loads - use minPerBuyer or quantityAvailable if lower
  useEffect(() => {
    if (listing) {
      const effectiveMin = listing.minPerBuyer && listing.minPerBuyer > 1
        ? Math.min(listing.minPerBuyer, listing.quantityAvailable)
        : 1;
      setQuantityToReserve(effectiveMin);
    }
  }, [listing?.minPerBuyer, listing?.quantityAvailable]);

  // Get more listings from the same seller
  const { data: sellerListings } = api.listing.getBySellerId.useQuery(
    {
      sellerId: listing?.sellerId ?? "",
      excludeListingId: id,
      limit: 4,
    },
    { enabled: !!listing?.sellerId }
  );

  // Get seller profile for registration date
  const { data: sellerProfile } = api.listing.getSellerProfile.useQuery(
    { sellerId: listing?.sellerId ?? "" },
    { enabled: !!listing?.sellerId }
  );

  // Get seller reviews
  const { data: sellerReviews, isLoading: reviewsLoading } =
    api.rating.getSellerReviews.useQuery(
      { sellerId: listing?.sellerId ?? "", limit: 50 },
      { enabled: !!listing?.sellerId && showReviewsModal }
    );

  const trackView = api.listing.trackView.useMutation();
  const { addVisited } = useLastVisited();

  const createReservation = api.reservation.create.useMutation({
    onSuccess: (data) => {
      // Redirect to payment page to pay deposit
      router.push(`/payment/${data.reservationId}`);
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        setReservationError(tReservation("pleaseSignIn"));
      } else {
        setReservationError(error.message || tReservation("reservationFailed"));
      }
    },
  });

  // Track view when component mounts and add to recently visited
  useEffect(() => {
    if (id && listing) {
      trackView.mutate({ listingId: id });
      addVisited(id);
    }
  }, [id, listing, addVisited]); // Only track once when listing loads

  // Keyboard navigation is now handled by the ImageLightbox component

  const handleReserve = async () => {
    if (!listing) return;

    setReservationError(null); // Clear any previous errors

    // Check if user is logged in
    if (!session?.user) {
      const callbackUrl = encodeURIComponent(`/listings/${id}`);
      router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
      return;
    }

    // Check phone verification
    if (!phoneStatus?.phoneVerified) {
      if (!phoneStatus?.hasPhone) {
        // No phone number - redirect to profile edit first
        router.push(`/profile/edit?redirect=${encodeURIComponent(`/auth/verify-phone?redirect=/listings/${id}`)}`);
      } else {
        // Has phone but not verified - redirect to verify
        router.push(`/auth/verify-phone?redirect=${encodeURIComponent(`/listings/${id}`)}`);
      }
      return;
    }

    try {
      await createReservation.mutateAsync({
        listingId: id,
        quantity: quantityToReserve,
      });
    } catch (error) {
      // Error will be handled by onError callback
      console.error("Reservation error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{tCommon("loading")}</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{tErrors("notFound")}</p>
      </div>
    );
  }

  const depositAmount = listing.pricePerPiece * quantityToReserve * 0.05;
  const totalPrice = listing.pricePerPiece * quantityToReserve;
  const displayedTotal = totalPrice * 1.05; // Inflated price shown to buyer
  const balanceDue = totalPrice; // Seller's price (what buyer pays at pickup)

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
        {tCommon("back")}
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left Column - Images and Description */}
        <div className="space-y-6">
          {/* Main Image */}
          <div className="aspect-video overflow-hidden rounded-lg bg-gray-200">
            {listing.photos && listing.photos.length > 0 ? (
              <button
                onClick={() => setShowLightbox(true)}
                className="group relative h-full w-full cursor-zoom-in"
              >
                <img
                  src={getStorageUrl(listing.photos[selectedPhotoIndex] ?? "")}
                  alt={listing.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/20">
                  <div className="flex items-center gap-2 rounded-lg bg-black/60 px-4 py-2 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                    <span className="text-sm font-medium">{tListing("clickToEnlarge")}</span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                {tListing("noPhoto")}
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {listing.photos && listing.photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {listing.photos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`aspect-square overflow-hidden rounded-lg bg-gray-200 transition-all ${
                    selectedPhotoIndex === idx
                      ? "ring-2 ring-green-500 ring-offset-2"
                      : "hover:opacity-75"
                  }`}
                >
                  <img
                    src={getStorageUrl(photo)}
                    alt={`Photo ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {tListing("description")}
            </h2>
            <p className="whitespace-pre-wrap text-gray-700">
              {listing.description}
            </p>
          </div>

          {/* Pickup Location */}
          {listing.postalCode && (
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {tListing("pickupLocation")}
                </h2>
                <Link
                  href={`/listings/search?lat=${listing.latitude}&lng=${listing.longitude}&radius=10`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700"
                >
                  {tListing("searchNearby")}
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
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-2xl font-bold text-green-600">
                  {listing.postalCode}
                </span>
              </div>
            </div>
          )}

          {/* Listing & Seller Information */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="space-y-2 text-sm text-gray-600">
              {listing.publishedAt && (
                <div>
                  <span className="font-medium">{tListing("publishedAt")}:</span>{" "}
                  {new Date(listing.publishedAt).toLocaleDateString()}
                </div>
              )}
              {sellerProfile?.createdAt && (
                <div>
                  <span className="font-medium">{tListing("sellerSince")}:</span>{" "}
                  {new Date(sellerProfile.createdAt).toLocaleDateString()}
                </div>
              )}
              <div>
                <span className="font-medium">{tListing("buyersReviews")}:</span>
                <div className="mt-1 flex items-center gap-2">
                  <StarRating
                    rating={
                      sellerProfile?.sellerRatingAverage ??
                      listing.seller?.sellerRatingAverage ??
                      0
                    }
                  />
                  <span className="font-semibold text-gray-900">
                    {(
                      sellerProfile?.sellerRatingAverage ??
                      listing.seller?.sellerRatingAverage ??
                      0
                    ).toFixed(1)}
                    /5
                  </span>
                  <span className="text-gray-500">-</span>
                  <button
                    onClick={() => setShowReviewsModal(true)}
                    className="font-medium text-green-600 hover:text-green-700 hover:underline"
                  >
                    {sellerProfile?.sellerRatingCount ??
                      listing.seller?.sellerRatingCount ??
                      0}{" "}
                    {tListing("reviews")}
                  </button>
                </div>
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

            {/* Engagement buttons */}
            <div className="mb-4 flex items-center gap-3">
              <LikeButton
                listingId={listing.id}
                initialLikesCount={listing.likesCount ?? 0}
                showCount={true}
                variant="button"
              />
              <FavoriteButton
                listingId={listing.id}
                variant="button"
              />
            </div>

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
              {!listing.isActive && (
                <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
                  {tListing("inactive")}
                </span>
              )}
            </div>

            <div className="mb-6 py-4">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-green-600">
                  ${(listing.pricePerPiece * 1.05).toFixed(2)}
                </span>
                <span className="text-sm text-gray-600">
                  {tListing("perPiece")}
                </span>
              </div>

              {/* Inventory Card */}
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>{tListing("quantityTotal")}:</span>
                    <span className="font-medium">
                      {listing.quantityTotal} {listing.quantityTotal > 1 ? tListing("pieces") : tListing("piece")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{tListing("quantityAvailable")}:</span>
                    <span className="font-medium">
                      {listing.quantityAvailable} {listing.quantityAvailable > 1 ? tListing("pieces") : tListing("piece")}
                    </span>
                  </div>
                  {listing.minPerBuyer && (
                    <div className="flex justify-between">
                      <span>{tListing("minPerBuyer")}:</span>
                      <span className="font-medium">
                        {listing.minPerBuyer} {listing.minPerBuyer > 1 ? tListing("pieces") : tListing("piece")}
                      </span>
                    </div>
                  )}
                  {listing.maxPerBuyer && (
                    <div className="flex justify-between">
                      <span>{tListing("maxPerBuyer")}:</span>
                      <span className="font-medium">
                        {listing.maxPerBuyer} {listing.maxPerBuyer > 1 ? tListing("pieces") : tListing("piece")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-gray-600">
                    <span>
                      {tListing("remaining", { percent: Math.round((listing.quantityAvailable / listing.quantityTotal) * 100) })}
                    </span>
                  </div>
                  <div className="h-4 w-full overflow-hidden rounded-lg bg-gray-200">
                    <div
                      className={`h-full transition-all ${
                        (listing.quantityAvailable / listing.quantityTotal) * 100 > 70
                          ? "bg-green-500"
                          : (listing.quantityAvailable / listing.quantityTotal) * 100 > 30
                            ? "bg-yellow-500"
                            : (listing.quantityAvailable / listing.quantityTotal) * 100 > 10
                              ? "bg-orange-500"
                              : "bg-red-500"
                      }`}
                      style={{
                        width: `${(listing.quantityAvailable / listing.quantityTotal) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-4">
              <label
                htmlFor="quantity"
                className="mb-2 block text-sm font-medium"
              >
                {tListing("quantity")}
              </label>
              {(() => {
                // If available < minPerBuyer, allow buying what's left
                const effectiveMin = listing.minPerBuyer
                  ? Math.min(listing.minPerBuyer, listing.quantityAvailable)
                  : 1;
                const effectiveMax = listing.maxPerBuyer
                  ? Math.min(listing.maxPerBuyer, listing.quantityAvailable)
                  : listing.quantityAvailable;
                return (
                  <>
                    <input
                      type="number"
                      id="quantity"
                      value={quantityToReserve}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= effectiveMin && val <= effectiveMax) {
                          setQuantityToReserve(val);
                        }
                      }}
                      min={effectiveMin}
                      max={effectiveMax}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                    />
                    {listing.minPerBuyer && listing.minPerBuyer > 1 && (
                      <p className="mt-1 text-xs text-amber-600">
                        {tReservation("minimumRequired", { min: effectiveMin })}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Price Breakdown */}
            <div className="mb-6 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{tReservation("totalPrice")}:</span>
                <span className="font-medium">
                  ${displayedTotal.toFixed(2)} CAD
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">
                  {tReservation("depositAmount")}:
                </span>
                <span className="font-medium text-green-600">
                  ${depositAmount.toFixed(2)} CAD
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>{tReservation("balanceDue")}:</span>
                <span>${balanceDue.toFixed(2)} CAD</span>
              </div>
            </div>

            {/* Reserve Button or Seller Notice */}
            {session?.user?.id === listing.sellerId ? (
              <div className="rounded-md bg-blue-50 p-4 text-center">
                <p className="text-sm font-medium text-blue-900">
                  {tListing("thisIsYourListing")}
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  {tListing("cannotReserveOwn")}
                </p>
              </div>
            ) : (
              <>
                {/* Inactive Notice */}
                {!listing.isActive && (
                  <div className="mb-4 rounded-md bg-orange-50 p-4 text-center">
                    <p className="text-sm font-medium text-orange-900">
                      {tListing("temporarilyUnavailable")}
                    </p>
                    <p className="mt-1 text-xs text-orange-700">
                      {tListing("checkBackLater")}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (depositAmount < 1) {
                      setShowMinDepositModal(true);
                      return;
                    }
                    setShowReserveModal(true);
                  }}
                  disabled={
                    listing.status !== "PUBLISHED" ||
                    listing.quantityAvailable === 0 ||
                    !listing.isActive
                  }
                  className="w-full rounded-md bg-green-600 px-6 py-3 text-lg font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {!listing.isActive
                    ? tListing("temporarilyUnavailable")
                    : listing.quantityAvailable === 0
                      ? tListing("outOfStock")
                      : tListing("reserveNow")}
                </button>

                {listing.isActive && (
                  <p className="mt-3 text-center text-xs text-gray-500">
                    {tReservation("balancePayment", {
                      amount: balanceDue.toFixed(2),
                    })}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* More from this seller */}
      {sellerListings && sellerListings.length > 0 && (
        <div className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {tListing("moreFromSeller")}
            </h2>
            <Link
              href={`/sellers/${listing.sellerId}`}
              className="text-sm font-medium text-green-600 hover:text-green-700"
            >
              {tListing("viewAllListings")} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {sellerListings.map((sellerListing) => (
              <ListingCard
                key={sellerListing.id}
                listing={sellerListing}
                variant="compact"
              />
            ))}
          </div>
        </div>
      )}

      {/* Reservation Confirmation Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">
              {tReservation("confirmReservation")}
            </h2>

            <div className="mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{tListing("itemTitle")}:</span>
                <span className="font-medium">{listing.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{tListing("quantity")}:</span>
                <span className="font-medium">{quantityToReserve} {quantityToReserve > 1 ? tListing("pieces") : tListing("piece")}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600">
                  {tReservation("depositAmount")}:
                </span>
                <span className="font-medium text-green-600">
                  ${depositAmount.toFixed(2)} CAD
                </span>
              </div>
            </div>

            {reservationError && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{reservationError}</p>
                {reservationError.includes("sign in") && (
                  <button
                    onClick={() => {
                      const callbackUrl = encodeURIComponent(`/listings/${id}`);
                      router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
                    }}
                    className="mt-2 text-sm font-medium text-red-900 underline hover:text-red-700"
                  >
                    {tListing("goToSignIn")}
                  </button>
                )}
              </div>
            )}

            <p className="mb-6 text-sm text-gray-600">
              {tListing("redirectToPayment", { amount: balanceDue.toFixed(2) })}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReserveModal(false);
                  setReservationError(null);
                }}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleReserve}
                disabled={createReservation.isPending}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {createReservation.isPending
                  ? tCommon("loading")
                  : tCommon("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimum Deposit Modal */}
      {showMinDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-center text-xl font-semibold">
              {tReservation("minimumDepositTitle")}
            </h2>
            <p className="mb-6 text-center text-gray-600">
              {tReservation("minimumDepositRequired")}
            </p>
            <button
              onClick={() => setShowMinDepositModal(false)}
              className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {tCommon("ok")}
            </button>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {listing.photos && listing.photos.length > 0 && (
        <ImageLightbox
          images={listing.photos}
          currentIndex={selectedPhotoIndex}
          isOpen={showLightbox}
          onClose={() => setShowLightbox(false)}
          onIndexChange={setSelectedPhotoIndex}
          alt={listing.title}
        />
      )}

      {/* Reviews Modal */}
      {showReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-xl font-semibold">
                {tListing("buyersReviews")}
              </h2>
              <button
                onClick={() => setShowReviewsModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {reviewsLoading ? (
                <div className="py-8 text-center text-gray-500">
                  {tCommon("loading")}
                </div>
              ) : sellerReviews?.reviews && sellerReviews.reviews.length > 0 ? (
                <div className="space-y-4">
                  {sellerReviews.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border-b border-gray-100 pb-4 last:border-0"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {review.buyerName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mb-2 flex items-center gap-2">
                        <StarRating rating={review.score} />
                        <span className="text-sm font-medium text-gray-700">
                          {review.score}/5
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600">{review.comment}</p>
                      )}
                      {review.listingTitle && (
                        <p className="mt-1 text-xs text-gray-400">
                          {tListing("forListing")}: {review.listingTitle}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  {tListing("noReviewsYet")}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4">
              <div className="text-center text-sm text-gray-500">
                {sellerReviews?.total ?? 0} {tListing("totalReviews")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
