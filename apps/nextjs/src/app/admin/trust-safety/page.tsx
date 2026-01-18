"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

// Notification state type
type Notification = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export default function TrustSafetyDashboard() {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRatingId, setSelectedRatingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification>(null);
  const [showScanResultModal, setShowScanResultModal] = useState(false);
  const [scanResult, setScanResult] = useState<{ type: "user" | "review"; message: string; details: string } | null>(null);

  const utils = api.useUtils();

  // Auto-dismiss notification after 3 seconds
  const showNotification = useCallback((type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // All hooks must be called before any conditional returns
  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: stats, isLoading: statsLoading } = api.trustSafety.getDashboardStats.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    }
  );
  const { data: highRiskUsers } = api.trustSafety.getHighRiskUsers.useQuery({
    minRiskScore: 0.6,
    limit: 20,
  }, {
    enabled: !!session?.user,
  });
  const { data: suspiciousReviews } = api.trustSafety.getSuspiciousReviews.useQuery({
    maxAuthenticityScore: 0.7,
    limit: 20,
  }, {
    enabled: !!session?.user,
  });

  const scanUser = api.trustSafety.scanUserForFraud.useMutation({
    onSuccess: (data) => {
      void utils.trustSafety.getHighRiskUsers.invalidate();
      setScanResult({
        type: "user",
        message: `Risk Score: ${(data.fraudResult.riskScore * 100).toFixed(1)}%`,
        details: data.fraudResult.riskScore >= 0.6
          ? "This user is flagged as high-risk and should be reviewed."
          : "This user appears to be low-risk.",
      });
      setShowScanResultModal(true);
    },
    onError: (error) => {
      showNotification("error", error.message || "Failed to scan user");
    },
  });

  const checkReview = api.trustSafety.checkReviewAuthenticity.useMutation({
    onSuccess: (data) => {
      void utils.trustSafety.getSuspiciousReviews.invalidate();
      setScanResult({
        type: "review",
        message: data.authenticityResult.isAuthentic ? "Authentic" : "Suspicious",
        details: data.authenticityResult.isAuthentic
          ? "This review appears to be genuine."
          : "This review shows signs of being fake or manipulated.",
      });
      setShowScanResultModal(true);
    },
    onError: (error) => {
      showNotification("error", error.message || "Failed to check review");
    },
  });

  // Now we can have conditional returns after all hooks are called
  if (sessionLoading || statsLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Note: Admin check is already done in the admin layout
  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/admin/trust-safety"));
    return null;
  }

  return (
    <div className="container mx-auto p-6">
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

      {/* Scan Result Modal */}
      {showScanResultModal && scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {scanResult.type === "user" ? "User Fraud Scan Result" : "Review Authenticity Result"}
            </h2>

            <div className={`mb-4 rounded-md p-4 ${
              scanResult.type === "user"
                ? scanResult.message.includes("high")
                  ? "bg-red-50"
                  : "bg-green-50"
                : scanResult.message === "Authentic"
                  ? "bg-green-50"
                  : "bg-orange-50"
            }`}>
              <p className={`text-lg font-bold ${
                scanResult.type === "user"
                  ? scanResult.message.includes("high")
                    ? "text-red-800"
                    : "text-green-800"
                  : scanResult.message === "Authentic"
                    ? "text-green-800"
                    : "text-orange-800"
              }`}>
                {scanResult.message}
              </p>
              <p className="mt-2 text-sm text-gray-700">
                {scanResult.details}
              </p>
            </div>

            <button
              onClick={() => {
                setShowScanResultModal(false);
                setScanResult(null);
              }}
              className="w-full rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
