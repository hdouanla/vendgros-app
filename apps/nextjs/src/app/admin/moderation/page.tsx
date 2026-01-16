"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function AdminModerationPage() {
  const t = useTranslations();
  const router = useRouter();
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const utils = api.useUtils();

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: pendingListings, isLoading: listingsLoading } =
    api.admin.getPendingListings.useQuery({
      limit: 50,
      offset: 0,
    }, {
      enabled: !!session?.user,
    });

  if (sessionLoading || listingsLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/admin/moderation"));
    return null;
  }

  // Check if user is admin
  if (session.user.userType !== "ADMIN") {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-4 text-gray-600">
            You do not have permission to access this page.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  const approveListing = api.admin.approveListing.useMutation({
    onSuccess: () => {
      void utils.admin.getPendingListings.invalidate();
    },
  });

  const rejectListing = api.admin.rejectListing.useMutation({
    onSuccess: () => {
      void utils.admin.getPendingListings.invalidate();
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedListing(null);
    },
  });

  const handleApprove = async (listingId: string) => {
    if (confirm(t("admin.approveListing") + "?")) {
      await approveListing.mutateAsync({ listingId });
    }
  };

  const handleRejectClick = (listingId: string) => {
    setSelectedListing(listingId);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedListing || !rejectionReason.trim()) return;

    await rejectListing.mutateAsync({
      listingId: selectedListing,
      reason: rejectionReason,
    });
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("admin.moderation")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("admin.pendingListings")}: {pendingListings?.total ?? 0}
        </p>
      </div>

      {/* Pending Listings */}
      {pendingListings?.listings && pendingListings.listings.length > 0 ? (
        <div className="space-y-6">
          {pendingListings.listings.map((listing) => (
            <div
              key={listing.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Listing Info */}
                <div className="lg:col-span-2">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {listing.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Category: {listing.category}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700">{listing.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">
                        {t("listing.pricePerPiece")}:
                      </span>{" "}
                      ${listing.pricePerPiece.toFixed(2)} CAD
                    </div>
                    <div>
                      <span className="font-medium">
                        {t("listing.quantity")}:
                      </span>{" "}
                      {listing.quantityTotal}
                    </div>
                    <div>
                      <span className="font-medium">
                        {t("listing.maxPerBuyer")}:
                      </span>{" "}
                      {listing.maxPerBuyer ?? "Unlimited"}
                    </div>
                    <div>
                      <span className="font-medium">
                        {t("listing.pickupAddress")}:
                      </span>{" "}
                      {listing.pickupAddress}
                    </div>
                  </div>

                  {listing.pickupInstructions && (
                    <div className="mt-4">
                      <span className="font-medium text-sm">
                        {t("listing.pickupInstructions")}:
                      </span>
                      <p className="mt-1 text-sm text-gray-600">
                        {listing.pickupInstructions}
                      </p>
                    </div>
                  )}

                  {/* Photos */}
                  {listing.photos && listing.photos.length > 0 && (
                    <div className="mt-4">
                      <div className="flex gap-2 overflow-x-auto">
                        {listing.photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`Photo ${idx + 1}`}
                            className="h-24 w-24 rounded object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Seller Info & Actions */}
                <div className="lg:col-span-1">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-3 font-semibold text-gray-900">
                      {t("listing.seller")}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {listing.seller.email}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>{" "}
                        {listing.seller.phone}
                      </div>
                      <div>
                        <span className="font-medium">
                          {t("listing.rating")}:
                        </span>{" "}
                        {listing.seller.ratingAverage?.toFixed(1) ?? "—"} (
                        {listing.seller.ratingCount} {t("listing.reviews")})
                      </div>
                      <div>
                        <span className="font-medium">
                          {t("profile.accountType")}:
                        </span>{" "}
                        {listing.seller.userType}
                      </div>
                      <div>
                        <span className="font-medium">Member since:</span>{" "}
                        {new Date(listing.seller.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => handleApprove(listing.id)}
                      disabled={approveListing.isPending}
                      className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {approveListing.isPending
                        ? t("common.loading")
                        : t("admin.approveListing")}
                    </button>

                    <button
                      onClick={() => handleRejectClick(listing.id)}
                      disabled={rejectListing.isPending}
                      className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {rejectListing.isPending
                        ? t("common.loading")
                        : t("admin.rejectListing")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-700">No pending listings to review</p>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">
              {t("admin.rejectListing")}
            </h2>

            <div className="mb-4">
              <label
                htmlFor="rejectionReason"
                className="block text-sm font-medium"
              >
                {t("admin.rejectionReason")} *
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500"
                placeholder="Explain why this listing is being rejected..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum 10 characters required
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                  setSelectedListing(null);
                }}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={
                  rejectListing.isPending || rejectionReason.trim().length < 10
                }
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectListing.isPending
                  ? t("common.loading")
                  : t("admin.rejectListing")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
