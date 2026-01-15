"use client";

// Prevent prerendering for authenticated pages
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { api } from "~/trpc/react";

export default function TrustSafetyDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRatingId, setSelectedRatingId] = useState<string | null>(null);

  const { data: stats } = api.trustSafety.getDashboardStats.useQuery();
  const { data: highRiskUsers } = api.trustSafety.getHighRiskUsers.useQuery({
    minRiskScore: 0.6,
    limit: 20,
  });
  const { data: suspiciousReviews } = api.trustSafety.getSuspiciousReviews.useQuery({
    maxAuthenticityScore: 0.7,
    limit: 20,
  });

  const scanUser = api.trustSafety.scanUserForFraud.useMutation({
    onSuccess: (data) => {
      alert(`Fraud scan complete. Risk score: ${(data.fraudResult.riskScore * 100).toFixed(1)}%`);
      void utils.trustSafety.getHighRiskUsers.invalidate();
    },
  });

  const checkReview = api.trustSafety.checkReviewAuthenticity.useMutation({
    onSuccess: (data) => {
      alert(
        `Review authenticity: ${data.authenticityResult.isAuthentic ? "Authentic" : "Suspicious"}`,
      );
      void utils.trustSafety.getSuspiciousReviews.invalidate();
    },
  });

  const utils = api.useUtils();

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-3xl font-bold">Trust & Safety Dashboard</h1>

      {/* Stats Overview */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm text-gray-600">High Risk Users</div>
          <div className="text-3xl font-bold text-red-600">
            {stats?.highRiskUsers ?? 0}
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm text-gray-600">Suspicious Reviews</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats?.suspiciousReviews ?? 0}
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm text-gray-600">No-Show Reservations</div>
          <div className="text-3xl font-bold text-yellow-600">
            {stats?.noShowReservations ?? 0}
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm text-gray-600">Avg Trust Score</div>
          <div className="text-3xl font-bold text-green-600">
            {stats?.averageTrustScore?.toFixed(0) ?? 0}
          </div>
        </div>
      </div>

      {/* High Risk Users Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">High Risk Users</h2>
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Trust Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Flags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {highRiskUsers?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.email}
                    </div>
                    <div className="text-sm text-gray-500">{user.id}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        (user.fraudRiskScore ?? 0) >= 0.8
                          ? "bg-red-100 text-red-800"
                          : (user.fraudRiskScore ?? 0) >= 0.6
                            ? "bg-orange-100 text-orange-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {((user.fraudRiskScore ?? 0) * 100).toFixed(0)}%
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {user.trustScore ?? "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {user.fraudFlags && user.fraudFlags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.fraudFlags.map((flag: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-block rounded bg-red-100 px-2 py-1 text-xs text-red-800"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No flags</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        user.accountStatus === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : user.accountStatus === "SUSPENDED"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.accountStatus}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button
                      onClick={() => {
                        setSelectedUserId(user.id);
                        scanUser.mutate({ userId: user.id });
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      disabled={scanUser.isPending}
                    >
                      {scanUser.isPending && selectedUserId === user.id
                        ? "Scanning..."
                        : "Rescan"}
                    </button>
                  </td>
                </tr>
              ))}
              {(!highRiskUsers || highRiskUsers.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No high-risk users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspicious Reviews Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-2xl font-semibold">Suspicious Reviews</h2>
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Reviewer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Reviewed User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Authenticity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Comment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Flags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {suspiciousReviews?.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {review.rater.email}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {review.rated.email}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-lg">{"⭐".repeat(review.score)}</span>
                      <span className="ml-2 text-sm text-gray-600">
                        {review.score}/5
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        (review.authenticityScore ?? 0) < 0.5
                          ? "bg-red-100 text-red-800"
                          : "bg-orange-100 text-orange-800"
                      }`}
                    >
                      {((review.authenticityScore ?? 0) * 100).toFixed(0)}%
                    </div>
                    {review.aiGenerated && (
                      <div className="mt-1">
                        <span className="inline-flex rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">
                          🤖 AI Generated
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="max-w-xs px-6 py-4">
                    <div className="truncate text-sm text-gray-900">
                      {review.comment ?? "(No comment)"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {review.authenticityFlags &&
                      review.authenticityFlags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {review.authenticityFlags.map(
                            (flag: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-block rounded bg-orange-100 px-2 py-1 text-xs text-orange-800"
                              >
                                {flag}
                              </span>
                            ),
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No flags</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button
                      onClick={() => {
                        setSelectedRatingId(review.id);
                        checkReview.mutate({ ratingId: review.id });
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      disabled={checkReview.isPending}
                    >
                      {checkReview.isPending && selectedRatingId === review.id
                        ? "Checking..."
                        : "Recheck"}
                    </button>
                  </td>
                </tr>
              ))}
              {(!suspiciousReviews || suspiciousReviews.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No suspicious reviews found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : "N/A"}
      </div>
    </div>
  );
}
