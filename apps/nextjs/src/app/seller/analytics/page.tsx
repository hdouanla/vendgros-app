"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

// Simple translation stub - replace with actual translations later
const t = (key: string) => {
  const translations: Record<string, string> = {
    "common.loading": "Loading...",
  };
  return translations[key] || key;
};

export default function SellerAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");

  const { data: analytics, isLoading } = api.analytics.getSellerAnalytics.useQuery({
    timeRange,
  });

  const { data: categoryPerformance } = api.analytics.getCategoryPerformance.useQuery();
  const { data: buyerInsights } = api.analytics.getBuyerInsights.useQuery();
  const { data: timeInsights } = api.analytics.getTimeBasedInsights.useQuery();

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  const maxDailyRevenue = Math.max(...analytics.dailyRevenue.map((d) => d.revenue));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seller Analytics</h1>
          <p className="mt-2 text-sm text-gray-600">
            Performance insights for your listings
          </p>
        </div>

        {/* Time Range Selector */}
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
          className="rounded-md border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
          <option value="all">All time</option>
        </select>
      </div>

      {/* Overview Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            ${analytics.overview.totalRevenue.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            CAD from {analytics.overview.completedReservations} completed orders
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Active Listings</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {analytics.overview.activeListings}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            of {analytics.overview.totalListings} total
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Completion Rate</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">
            {(analytics.overview.completionRate * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {analytics.overview.completedReservations} /{" "}
            {analytics.overview.totalReservations} reservations
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Average Rating</p>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {analytics.overview.avgRating.toFixed(1)} ⭐
          </p>
          <p className="mt-1 text-xs text-gray-500">
            from {analytics.overview.totalRatings} ratings
          </p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Total Reservations</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {analytics.overview.totalReservations}
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Total Deposits</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${analytics.overview.totalDeposits.toFixed(2)}
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">No-Show Rate</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {(analytics.overview.noShowRate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Revenue Trend (Last 30 Days)
        </h2>
        <div className="space-y-2">
          {analytics.dailyRevenue.map((day, idx) => {
            const percentage =
              maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0;
            const displayDate = new Date(day.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });

            return (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-16 text-xs text-gray-600">{displayDate}</div>
                <div className="flex-1">
                  <div className="h-6 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-green-600 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right text-sm font-medium text-gray-900">
                  ${day.revenue.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Top Listings */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Top Performing Listings
          </h2>
          <div className="space-y-3">
            {analytics.topListings.length > 0 ? (
              analytics.topListings.map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{listing.title}</p>
                    <p className="text-xs text-gray-500">
                      {listing.reservationsCount} reservations
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ${listing.revenue.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">{listing.status}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500">
                No listings with revenue yet
              </p>
            )}
          </div>
        </div>

        {/* Category Performance */}
        {categoryPerformance && categoryPerformance.length > 0 && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Performance by Category
            </h2>
            <div className="space-y-3">
              {categoryPerformance.map((cat) => (
                <div
                  key={cat.category}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-gray-900">{cat.category}</p>
                    <p className="font-semibold text-green-600">
                      ${cat.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="block">Listings</span>
                      <span className="font-medium text-gray-900">
                        {cat.listingCount}
                      </span>
                    </div>
                    <div>
                      <span className="block">Reservations</span>
                      <span className="font-medium text-gray-900">
                        {cat.reservationCount}
                      </span>
                    </div>
                    <div>
                      <span className="block">Avg/Listing</span>
                      <span className="font-medium text-gray-900">
                        ${cat.avgRevenuePerListing.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Buyer Insights */}
      {buyerInsights && (
        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Buyer Insights
          </h2>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-600">Total Unique Buyers</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">
                {buyerInsights.totalUniqueBuyers}
              </p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <p className="text-sm text-purple-600">Repeat Buyers</p>
              <p className="mt-1 text-2xl font-bold text-purple-900">
                {buyerInsights.repeatBuyers}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-600">Repeat Rate</p>
              <p className="mt-1 text-2xl font-bold text-green-900">
                {(buyerInsights.repeatBuyerRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <h3 className="mb-3 font-medium text-gray-900">Top Buyers</h3>
          <div className="space-y-2">
            {buyerInsights.topBuyers.slice(0, 5).map((buyer, idx) => (
              <div
                key={buyer.buyerId}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{buyer.email}</p>
                    <p className="text-xs text-gray-500">
                      {buyer.reservationCount} orders
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    ${buyer.totalSpent.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last: {new Date(buyer.lastReservation).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time-Based Insights */}
      {timeInsights && (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* By Day of Week */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Performance by Day of Week
            </h2>
            <div className="space-y-3">
              {timeInsights.byDayOfWeek.map((day) => {
                const maxReservations = Math.max(
                  ...timeInsights.byDayOfWeek.map((d) => d.reservations),
                );
                const percentage =
                  maxReservations > 0
                    ? (day.reservations / maxReservations) * 100
                    : 0;

                return (
                  <div key={day.day} className="flex items-center gap-3">
                    <div className="w-12 text-sm font-medium text-gray-700">
                      {day.day}
                    </div>
                    <div className="flex-1">
                      <div className="h-8 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm">
                      <span className="font-medium text-gray-900">
                        {day.reservations}
                      </span>
                      <span className="text-gray-500"> orders</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Hour of Day */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Peak Activity Hours
            </h2>
            <div className="space-y-2">
              {timeInsights.byHourOfDay
                .filter((h) => h.reservations > 0)
                .sort((a, b) => b.reservations - a.reservations)
                .slice(0, 8)
                .map((hour) => (
                  <div
                    key={hour.hour}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-2"
                  >
                    <span className="font-medium text-gray-900">
                      {hour.hour.toString().padStart(2, "0")}:00 -{" "}
                      {(hour.hour + 1).toString().padStart(2, "0")}:00
                    </span>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        {hour.reservations}
                      </span>
                      <span className="text-sm text-gray-500"> orders</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
