"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export default function PricingInsightsPage() {
  const t = useTranslations();
  const [selectedListing, setSelectedListing] = useState<string | null>(null);

  const { data: insights, isLoading } = api.pricing.getPricingInsights.useQuery();

  const { data: priceAnalysis, isLoading: analysisLoading } =
    api.pricing.analyzePricePerformance.useQuery(
      { listingId: selectedListing! },
      { enabled: !!selectedListing },
    );

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
        <h1 className="text-3xl font-bold text-gray-900">Pricing Insights</h1>
        <p className="mt-2 text-sm text-gray-600">
          AI-powered pricing recommendations for your listings
        </p>
      </div>

      {/* Alert for listings needing attention */}
      {insights && insights.filter((i) => i.needsAttention).length > 0 && (
        <div className="mb-6 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">⚠️</div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>
                  {insights.filter((i) => i.needsAttention).length} listings
                </strong>{" "}
                may need price adjustments to improve performance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Overview Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Active Listings</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {insights?.length ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">Being tracked</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Needs Attention</p>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {insights?.filter((i) => i.needsAttention).length ?? 0}
          </p>
          <p className="mt-1 text-xs text-gray-500">Low sell-through rate</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Avg Sell-Through</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {insights && insights.length > 0
              ? (
                  (insights.reduce((sum, i) => sum + i.sellThroughRate, 0) /
                    insights.length) *
                  100
                ).toFixed(1)
              : 0}
            %
          </p>
          <p className="mt-1 text-xs text-gray-500">Across all listings</p>
        </div>
      </div>

      {/* Listings Table */}
      {insights && insights.length > 0 ? (
        <div className="rounded-lg bg-white shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Your Listings Performance
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Listing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sell-Through
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Listed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reservations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {insights.map((insight) => (
                  <tr key={insight.listingId} className={insight.needsAttention ? "bg-yellow-50" : ""}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {insight.title}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">
                        ${insight.currentPrice.toFixed(2)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                          <div
                            className={`h-full ${
                              insight.sellThroughRate >= 0.7
                                ? "bg-green-600"
                                : insight.sellThroughRate >= 0.3
                                  ? "bg-yellow-600"
                                  : "bg-red-600"
                            }`}
                            style={{ width: `${insight.sellThroughRate * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">
                          {(insight.sellThroughRate * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {insight.daysListed}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {insight.reservationCount}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {insight.needsAttention ? (
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800">
                          Needs Attention
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                          On Track
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <button
                        onClick={() => setSelectedListing(insight.listingId)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center">
          <p className="text-gray-700">No active listings to analyze</p>
          <p className="mt-2 text-sm text-gray-500">
            Create a listing to get AI-powered pricing insights
          </p>
        </div>
      )}

      {/* Price Analysis Modal */}
      {selectedListing && priceAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                Price Analysis: {priceAnalysis.listing.title}
              </h2>
              <button
                onClick={() => setSelectedListing(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Performance Score */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-600">Performance Score</p>
              <p className="mt-2 text-4xl font-bold text-blue-900">
                {(priceAnalysis.performanceScore * 100).toFixed(0)}%
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${priceAnalysis.performanceScore * 100}%` }}
                />
              </div>
            </div>

            {/* Recommendation Card */}
            <div
              className={`mb-6 rounded-lg border-2 p-6 ${
                priceAnalysis.recommendation === "increase"
                  ? "border-green-300 bg-green-50"
                  : priceAnalysis.recommendation === "decrease"
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 bg-gray-50"
              }`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Recommendation
                  </p>
                  <p className="mt-1 text-2xl font-bold uppercase text-gray-900">
                    {priceAnalysis.recommendation === "increase"
                      ? "↗️ Increase Price"
                      : priceAnalysis.recommendation === "decrease"
                        ? "↘️ Decrease Price"
                        : "➡️ Maintain Price"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Suggested Price</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${priceAnalysis.suggestedPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Currently: ${priceAnalysis.currentPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-white p-4">
                <p className="text-sm font-medium text-gray-900">Reasoning:</p>
                <p className="mt-1 text-sm text-gray-700">
                  {priceAnalysis.reasoning}
                </p>
              </div>

              {priceAnalysis.adjustmentPercentage !== 0 && (
                <div className="mt-4 rounded-lg bg-white p-3">
                  <p className="text-sm text-gray-600">
                    Suggested Adjustment:{" "}
                    <span
                      className={`font-bold ${
                        priceAnalysis.adjustmentPercentage > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {priceAnalysis.adjustmentPercentage > 0 ? "+" : ""}
                      {priceAnalysis.adjustmentPercentage.toFixed(1)}%
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Listing Stats */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-600">Days Listed</p>
                <p className="text-xl font-bold text-gray-900">
                  {priceAnalysis.listing.daysListed}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-600">Total Quantity</p>
                <p className="text-xl font-bold text-gray-900">
                  {priceAnalysis.listing.quantityTotal}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-600">Remaining</p>
                <p className="text-xl font-bold text-gray-900">
                  {priceAnalysis.listing.quantityAvailable}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedListing(null)}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // TODO: Implement price update
                  alert("Price update functionality coming soon!");
                }}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Update Price to ${priceAnalysis.suggestedPrice.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
