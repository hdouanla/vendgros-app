"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ImageGalleryWithPreview } from "~/components/ui/image-lightbox";

// Notification state type
type Notification = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export default function AIModerationDashboard() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "ai_approved" | "ai_flagged" | "no_ai">("all");
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [selectedListingTitle, setSelectedListingTitle] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [notification, setNotification] = useState<Notification>(null);

  const utils = api.useUtils();

  // Auto-dismiss notification after 3 seconds
  const showNotification = useCallback((type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // All hooks must be called before any conditional returns
  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: moderationQueue, isLoading: queueLoading } =
    api.moderation.getModerationQueue.useQuery({
      limit: 50,
      offset: 0,
      filter,
    }, {
      enabled: !!session?.user,
    });

  const { data: stats } = api.moderation.getModerationStats.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    }
  );

  const runAIModeration = api.moderation.runAIModeration.useMutation({
    onSuccess: () => {
      void utils.moderation.getModerationQueue.invalidate();
      void utils.moderation.getModerationStats.invalidate();
      showNotification("success", "AI moderation completed");
    },
    onError: (error) => {
      showNotification("error", error.message || "AI moderation failed");
    },
  });

  const bulkAutoApprove = api.moderation.bulkAutoApprove.useMutation({
    onSuccess: (data) => {
      void utils.moderation.getModerationQueue.invalidate();
      void utils.moderation.getModerationStats.invalidate();
      setShowBulkApproveModal(false);
      showNotification("success", `Auto-approved ${data.approvedCount} listings`);
    },
    onError: (error) => {
      showNotification("error", error.message || "Bulk approval failed");
    },
  });

  const approveListing = api.admin.approveListing.useMutation({
    onSuccess: () => {
      void utils.moderation.getModerationQueue.invalidate();
      setShowApproveModal(false);
      setSelectedListing(null);
      setSelectedListingTitle("");
      showNotification("success", "Listing approved successfully");
    },
    onError: (error) => {
      showNotification("error", error.message || "Failed to approve listing");
    },
  });

  const rejectListing = api.admin.rejectListing.useMutation({
    onSuccess: () => {
      void utils.moderation.getModerationQueue.invalidate();
      setShowRejectModal(false);
      setRejectionReason("");
      setSelectedListing(null);
      setSelectedListingTitle("");
      showNotification("success", "Listing rejected. Seller has been notified.");
    },
    onError: (error) => {
      showNotification("error", error.message || "Failed to reject listing");
    },
  });

  // Now we can have conditional returns after all hooks are called
  if (sessionLoading || queueLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Note: Admin check is already done in the admin layout
  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/admin/moderation-ai"));
    return null;
  }

  const handleRunAIModeration = async (listingId: string) => {
    await runAIModeration.mutateAsync({ listingId });
  };

  const handleBulkAutoApprove = async () => {
    await bulkAutoApprove.mutateAsync({ minScore: 0.85, maxCount: 50 });
  };

  const handleApproveClick = (listingId: string, title: string) => {
    setSelectedListing(listingId);
    setSelectedListingTitle(title);
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async () => {
    if (!selectedListing) return;
    await approveListing.mutateAsync({ listingId: selectedListing });
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
              : notification.type === "error"
                ? "bg-red-600 text-white"
                : "bg-blue-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === "success" ? "✓" : notification.type === "error" ? "✕" : "ℹ"}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              AI Moderation Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Listings in queue: {moderationQueue?.listings.length ?? 0}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowStatsModal(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              📊 View Stats
            </button>

            <button
              onClick={() => setShowBulkApproveModal(true)}
              disabled={bulkAutoApprove.isPending}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {bulkAutoApprove.isPending ? "Processing..." : "🤖 Bulk Auto-Approve"}
            </button>
          </div>
        </div>

        {/* AI Stats Summary */}
        {stats && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-600">AI Moderated</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.aiModerated} / {stats.totalListings}
              </p>
              <p className="text-xs text-gray-500">
                {(stats.aiModerationRate * 100).toFixed(1)}%
              </p>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-600">Auto-Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.autoApproved}
              </p>
              <p className="text-xs text-gray-500">
                {(stats.autoApprovalRate * 100).toFixed(1)}% of AI moderated
              </p>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-600">Flagged</p>
              <p className="text-2xl font-bold text-red-600">{stats.flagged}</p>
              <p className="text-xs text-gray-500">
                {(stats.flagRate * 100).toFixed(1)}% of AI moderated
              </p>
            </div>

            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-600">Avg AI Score</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.avgModerationScore.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">Confidence score (0-1)</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-sm font-medium ${
            filter === "all"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("ai_approved")}
          className={`px-4 py-2 text-sm font-medium ${
            filter === "ai_approved"
              ? "border-b-2 border-green-600 text-green-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          AI Approved
        </button>
        <button
          onClick={() => setFilter("ai_flagged")}
          className={`px-4 py-2 text-sm font-medium ${
            filter === "ai_flagged"
              ? "border-b-2 border-red-600 text-red-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          AI Flagged
        </button>
        <button
          onClick={() => setFilter("no_ai")}
          className={`px-4 py-2 text-sm font-medium ${
            filter === "no_ai"
              ? "border-b-2 border-gray-600 text-gray-900"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          No AI Moderation
        </button>
      </div>

      {/* Listings */}
      {moderationQueue?.listings && moderationQueue.listings.length > 0 ? (
        <div className="space-y-6">
          {moderationQueue.listings.map((listing) => (
            <div
              key={listing.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Listing Info */}
                <div className="lg:col-span-2">
                  {/* AI Score Badge */}
                  {listing.aiModerationScore !== null && (
                    <div className="mb-4 flex items-center gap-3">
                      <div
                        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                          listing.aiModerationScore >= 0.8
                            ? "bg-green-100 text-green-800"
                            : listing.aiModerationScore >= 0.5
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        🤖 AI Score: {(listing.aiModerationScore * 100).toFixed(0)}%
                      </div>

                      {listing.aiModerationFlags &&
                        listing.aiModerationFlags.length > 0 && (
                          <div className="text-sm text-red-600">
                            🚩 {listing.aiModerationFlags.length} flags
                          </div>
                        )}
                    </div>
                  )}

                  {/* AI Flags */}
                  {listing.aiModerationFlags && listing.aiModerationFlags.length > 0 && (
                    <div className="mb-4 rounded-md bg-red-50 p-3">
                      <p className="mb-2 text-sm font-medium text-red-800">
                        AI Detected Issues:
                      </p>
                      <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                        {listing.aiModerationFlags.map((flag, idx) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

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
                      <span className="font-medium">Price:</span> $
                      {listing.pricePerPiece.toFixed(2)} CAD
                    </div>
                    <div>
                      <span className="font-medium">Quantity:</span>{" "}
                      {listing.quantityTotal}
                    </div>
                  </div>

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

                {/* Actions Sidebar */}
                <div className="lg:col-span-1">
                  {/* Seller Info */}
                  <div className="mb-4 rounded-lg bg-gray-50 p-4">
                    <h3 className="mb-2 font-semibold text-gray-900">Seller</h3>
                    <div className="space-y-1 text-sm">
                      <div>{listing.seller.email}</div>
                      <div>
                        ⭐ {listing.seller.ratingAverage?.toFixed(1) ?? "—"} (
                        {listing.seller.ratingCount})
                      </div>
                    </div>
                  </div>

                  {/* AI Actions */}
                  <div className="space-y-2">
                    {!listing.aiModeratedAt && (
                      <button
                        onClick={() => handleRunAIModeration(listing.id)}
                        disabled={runAIModeration.isPending}
                        className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        {runAIModeration.isPending ? "Analyzing..." : "🤖 Run AI Moderation"}
                      </button>
                    )}

                    <button
                      onClick={() => handleApproveClick(listing.id, listing.title)}
                      disabled={approveListing.isPending}
                      className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      ✅ Approve
                    </button>

                    <button
                      onClick={() => handleRejectClick(listing.id, listing.title)}
                      disabled={rejectListing.isPending}
                      className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-700">No listings matching filter</p>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && stats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-2xl font-semibold">
              AI Moderation Statistics
            </h2>

            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="mb-2 font-medium">Overall Performance</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Listings:</span>
                    <span className="ml-2 font-medium">{stats.totalListings}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">AI Moderated:</span>
                    <span className="ml-2 font-medium">{stats.aiModerated}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Auto-Approved:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {stats.autoApproved}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Flagged:</span>
                    <span className="ml-2 font-medium text-red-600">
                      {stats.flagged}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="mb-2 font-medium">AI Efficiency</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Moderation Rate:</span>
                    <span className="font-medium">
                      {(stats.aiModerationRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Auto-Approval Rate:</span>
                    <span className="font-medium text-green-600">
                      {(stats.autoApprovalRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Flag Rate:</span>
                    <span className="font-medium text-red-600">
                      {(stats.flagRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Confidence Score:</span>
                    <span className="font-medium">
                      {stats.avgModerationScore.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowStatsModal(false)}
              className="mt-4 w-full rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bulk Auto-Approve Modal */}
      {showBulkApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Bulk Auto-Approve
            </h2>

            <p className="mb-4 text-gray-700">
              This will auto-approve all listings with:
            </p>

            <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-gray-600">
              <li>AI moderation score ≥ 85%</li>
              <li>No AI flags detected</li>
              <li>Up to 50 listings at a time</li>
            </ul>

            <p className="mb-6 text-sm text-red-600 font-medium">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkApproveModal(false)}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAutoApprove}
                disabled={bulkAutoApprove.isPending}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {bulkAutoApprove.isPending ? "Processing..." : "Approve All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Approve Listing
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
                Cancel
              </button>
              <button
                onClick={handleApproveSubmit}
                disabled={approveListing.isPending}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {approveListing.isPending ? "Approving..." : "Approve"}
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
              Reject Listing
            </h2>

            <div className="mb-4 rounded-md bg-gray-50 p-3">
              <p className="font-medium text-gray-900">{selectedListingTitle}</p>
            </div>

            <div className="mb-4">
              <label
                htmlFor="rejectionReason"
                className="block text-sm font-medium text-gray-700"
              >
                Rejection Reason *
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
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectListing.isPending || rejectionReason.trim().length < 10}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectListing.isPending ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
