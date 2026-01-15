"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export default function AIModerationDashboard() {
  const t = useTranslations();
  const [filter, setFilter] = useState<"all" | "ai_approved" | "ai_flagged" | "no_ai">("all");
  const [showStatsModal, setShowStatsModal] = useState(false);

  const utils = api.useUtils();

  const { data: moderationQueue, isLoading } =
    api.moderation.getModerationQueue.useQuery({
      limit: 50,
      offset: 0,
      filter,
    });

  const { data: stats } = api.moderation.getModerationStats.useQuery();

  const runAIModeration = api.moderation.runAIModeration.useMutation({
    onSuccess: () => {
      void utils.moderation.getModerationQueue.invalidate();
      void utils.moderation.getModerationStats.invalidate();
    },
  });

  const bulkAutoApprove = api.moderation.bulkAutoApprove.useMutation({
    onSuccess: (data) => {
      void utils.moderation.getModerationQueue.invalidate();
      void utils.moderation.getModerationStats.invalidate();
      alert(`Auto-approved ${data.approvedCount} listings`);
    },
  });

  const approveListing = api.admin.approveListing.useMutation({
    onSuccess: () => {
      void utils.moderation.getModerationQueue.invalidate();
    },
  });

  const handleRunAIModeration = async (listingId: string) => {
    await runAIModeration.mutateAsync({ listingId });
  };

  const handleBulkAutoApprove = async () => {
    if (
      confirm(
        "Auto-approve all listings with AI score >= 0.85 and no flags? This action cannot be undone.",
      )
    ) {
      await bulkAutoApprove.mutateAsync({ minScore: 0.85, maxCount: 50 });
    }
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
              onClick={handleBulkAutoApprove}
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
                      onClick={() => approveListing.mutate({ listingId: listing.id })}
                      disabled={approveListing.isPending}
                      className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      ✅ Approve
                    </button>

                    <button className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
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
    </div>
  );
}
