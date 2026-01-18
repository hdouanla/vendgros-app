"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ImageGalleryWithPreview } from "~/components/ui/image-lightbox";

// Simple notification state
type Notification = {
  type: "success" | "error";
  message: string;
} | null;

// Simple translation stub for MVP
const t = (key: string) => {
  const translations: Record<string, string> = {
    "common.loading": "Loading...",
    "common.cancel": "Cancel",
    "admin.moderation": "Listing Moderation",
    "admin.pendingListings": "Pending Listings",
    "admin.approveListing": "Approve Listing",
    "admin.rejectListing": "Reject Listing",
    "admin.rejectionReason": "Rejection Reason",
    "listing.pricePerPiece": "Price per piece",
    "listing.quantity": "Quantity",
    "listing.maxPerBuyer": "Max per buyer",
    "listing.pickupAddress": "Pickup Address",
    "listing.pickupInstructions": "Pickup Instructions",
    "listing.seller": "Seller Information",
    "listing.rating": "Rating",
    "listing.reviews": "reviews",
  };
  return translations[key] || key;
};

export default function AdminModerationPage() {
  const router = useRouter();
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [selectedListingTitle, setSelectedListingTitle] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [notification, setNotification] = useState<Notification>(null);

  const utils = api.useUtils();

  // Auto-dismiss notification after 3 seconds
  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // All hooks must be called before any conditional returns
  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: pendingListings, isLoading: listingsLoading } =
    api.admin.getPendingListings.useQuery({
      limit: 50,
      offset: 0,
    }, {
      enabled: !!session?.user,
    });

  const approveListing = api.admin.approveListing.useMutation({
    onSuccess: () => {
      void utils.admin.getPendingListings.invalidate();
      showNotification("success", "Listing approved successfully! Seller has been notified.");
    },
    onError: (error) => {
      showNotification("error", error.message || "Failed to approve listing");
    },
  });

  const rejectListing = api.admin.rejectListing.useMutation({
    onSuccess: () => {
      void utils.admin.getPendingListings.invalidate();
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedListing(null);
      setSelectedListingTitle("");
      showNotification("success", "Listing rejected. Seller has been notified with the reason.");
    },
    onError: (error) => {
      showNotification("error", error.message || "Failed to reject listing");
    },
  });

  // Now we can have conditional returns after all hooks are called
  if (sessionLoading || listingsLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  // Note: Admin check is already done in the admin layout, so we only need to check for session
  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/admin/moderation"));
    return null;
  }

  const handleApproveClick = (listingId: string, title: string) => {
    setSelectedListing(listingId);
    setSelectedListingTitle(title);
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async () => {
    if (!selectedListing) return;

    await approveListing.mutateAsync({ listingId: selectedListing });
    setShowApproveModal(false);
    setSelectedListing(null);
    setSelectedListingTitle("");
  };

  const handleRejectClick = (listingId: string, title: string) => {
    setSelectedListing(listingId);
    setSelectedListingTitle(title);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedListing || !rejectionReason.trim()) return;

    await rejectListing.mutateAsync({
      listingId: selectedListing,
      reason: rejectionReason,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-6 py-4 shadow-lg transition-all ${
            notification.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === "success" ? "✓" : "✕"}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

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
                      <ImageGalleryWithPreview
                        images={listing.photos}
                        alt={listing.title}
                        mainImageAspect="video"
                        thumbnailColumns={4}
                      />
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
                        {listing.seller.phone ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium">
                          {t("listing.rating")}:
                        </span>{" "}
                        {listing.seller.ratingAverage?.toFixed(1) ?? "—"} (
                        {listing.seller.ratingCount} {t("listing.reviews")})
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>{" "}
                        {listing.seller.accountStatus}
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
                      onClick={() => handleApproveClick(listing.id, listing.title)}
                      disabled={approveListing.isPending}
                      className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {approveListing.isPending
                        ? t("common.loading")
                        : t("admin.approveListing")}
                    </button>

                    <button
                      onClick={() => handleRejectClick(listing.id, listing.title)}
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

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {t("admin.approveListing")}
            </h2>

            <p className="mb-2 text-gray-700">
              Are you sure you want to approve this listing?
            </p>

            <div className="mb-6 rounded-md bg-gray-50 p-3">
              <p className="font-medium text-gray-900">{selectedListingTitle}</p>
            </div>

            <p className="mb-6 text-sm text-gray-500">
              Once approved, this listing will be visible to all buyers on the marketplace.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedListing(null);
                  setSelectedListingTitle("");
                }}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleApproveSubmit}
                disabled={approveListing.isPending}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {approveListing.isPending
                  ? t("common.loading")
                  : t("admin.approveListing")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {t("admin.rejectListing")}
            </h2>

            <div className="mb-4 rounded-md bg-gray-50 p-3">
              <p className="font-medium text-gray-900">{selectedListingTitle}</p>
            </div>

            <div className="mb-4">
              <label
                htmlFor="rejectionReason"
                className="block text-sm font-medium text-gray-700"
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
                Minimum 10 characters required. This reason will be shown to the seller.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                  setSelectedListing(null);
                  setSelectedListingTitle("");
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
