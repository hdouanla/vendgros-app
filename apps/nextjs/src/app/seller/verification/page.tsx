"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

// Badge emoji mapping
const BADGE_DISPLAY = {
  NONE: { emoji: "", name: "No Badge", color: "gray" },
  VERIFIED: { emoji: "✓", name: "Verified", color: "green" },
  TRUSTED: { emoji: "✓✓", name: "Trusted", color: "blue" },
  PREMIUM: { emoji: "⭐", name: "Premium", color: "yellow" },
};

export default function VerificationPage() {
  const t = useTranslations();
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityMethod, setIdentityMethod] = useState<
    "government_id" | "business_license" | "other"
  >("government_id");
  const [identityNotes, setIdentityNotes] = useState("");

  const utils = api.useUtils();

  const { data: eligibility, isLoading } =
    api.verification.checkEligibility.useQuery();

  const { data: badgeCriteria } = api.verification.getBadgeCriteria.useQuery();

  const applyForBadge = api.verification.applyForBadge.useMutation({
    onSuccess: (data) => {
      void utils.verification.checkEligibility.invalidate();
      alert(data.message);
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const requestIdentityVerification =
    api.verification.requestIdentityVerification.useMutation({
      onSuccess: (data) => {
        void utils.verification.checkEligibility.invalidate();
        setShowIdentityModal(false);
        alert(data.message);
      },
    });

  const handleApplyForBadge = async (badge: "VERIFIED" | "TRUSTED" | "PREMIUM") => {
    if (
      confirm(
        `Apply for ${badge} badge? You must meet all requirements to qualify.`,
      )
    ) {
      await applyForBadge.mutateAsync({ targetBadge: badge });
    }
  };

  const handleRequestIdentityVerification = async () => {
    await requestIdentityVerification.mutateAsync({
      method: identityMethod,
      notes: identityNotes,
    });
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!eligibility) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Unable to load verification status</p>
      </div>
    );
  }

  const currentBadgeInfo =
    BADGE_DISPLAY[eligibility.currentBadge as keyof typeof BADGE_DISPLAY];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Seller Verification
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Build trust with buyers by earning verification badges
        </p>
      </div>

      {/* Current Badge Status */}
      <div className="mb-8 rounded-lg border-2 border-gray-200 bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Current Badge</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-4xl">{currentBadgeInfo.emoji}</span>
              <div>
                <p
                  className={`text-2xl font-bold text-${currentBadgeInfo.color}-600`}
                >
                  {currentBadgeInfo.name}
                </p>
                {eligibility.currentBadge !== "NONE" &&
                  eligibility.stats.accountAgeDays && (
                    <p className="text-xs text-gray-500">
                      Verified for {eligibility.stats.accountAgeDays} days
                    </p>
                  )}
              </div>
            </div>
          </div>

          {!eligibility.stats.identityVerified && (
            <button
              onClick={() => setShowIdentityModal(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Verify Identity
            </button>
          )}
        </div>
      </div>

      {/* Your Stats */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Your Performance Stats
        </h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Completed Transactions</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {eligibility.stats.completedTransactions}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Average Rating</p>
            <p className="mt-1 text-2xl font-bold text-yellow-600">
              {eligibility.stats.rating?.toFixed(1) ?? "0.0"} ⭐
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Rating Count</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {eligibility.stats.ratingCount}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-600">No-Show Rate</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {(eligibility.stats.noShowRate * 100).toFixed(1)}%
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Account Age</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {eligibility.stats.accountAgeDays} days
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Total Revenue</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              ${eligibility.stats.totalRevenue.toFixed(0)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-600">Identity Verified</p>
            <p className="mt-1 text-2xl font-bold">
              {eligibility.stats.identityVerified ? "✓ Yes" : "✗ No"}
            </p>
          </div>
        </div>
      </div>

      {/* Badge Levels */}
      {badgeCriteria && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Badge Levels</h2>

          {/* Verified Badge */}
          <div className="rounded-lg border-2 border-green-200 bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">✓</span>
                <div>
                  <h3 className="text-xl font-semibold text-green-600">
                    {badgeCriteria.verified.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {badgeCriteria.verified.description}
                  </p>
                </div>
              </div>

              {eligibility.eligibility.verified.eligible ? (
                <button
                  onClick={() => handleApplyForBadge("VERIFIED")}
                  disabled={applyForBadge.isPending}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {applyForBadge.isPending ? "Applying..." : "Apply Now"}
                </button>
              ) : (
                <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">
                  Not Eligible
                </span>
              )}
            </div>

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Requirements:
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                {badgeCriteria.verified.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            {!eligibility.eligibility.verified.eligible && (
              <div className="rounded-lg bg-yellow-50 p-3">
                <p className="mb-1 text-sm font-medium text-yellow-800">
                  Missing Requirements:
                </p>
                <ul className="space-y-1 text-sm text-yellow-700">
                  {eligibility.eligibility.verified.missing.map((req, idx) => (
                    <li key={idx}>• {req}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Benefits:
              </p>
              <ul className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
                {badgeCriteria.verified.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Trusted Badge */}
          <div className="rounded-lg border-2 border-blue-200 bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">✓✓</span>
                <div>
                  <h3 className="text-xl font-semibold text-blue-600">
                    {badgeCriteria.trusted.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {badgeCriteria.trusted.description}
                  </p>
                </div>
              </div>

              {eligibility.eligibility.trusted.eligible ? (
                <button
                  onClick={() => handleApplyForBadge("TRUSTED")}
                  disabled={applyForBadge.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {applyForBadge.isPending ? "Applying..." : "Apply Now"}
                </button>
              ) : (
                <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">
                  Not Eligible
                </span>
              )}
            </div>

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Requirements:
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                {badgeCriteria.trusted.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600">✓</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            {!eligibility.eligibility.trusted.eligible && (
              <div className="rounded-lg bg-yellow-50 p-3">
                <p className="mb-1 text-sm font-medium text-yellow-800">
                  Missing Requirements:
                </p>
                <ul className="space-y-1 text-sm text-yellow-700">
                  {eligibility.eligibility.trusted.missing.map((req, idx) => (
                    <li key={idx}>• {req}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Benefits:
              </p>
              <ul className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
                {badgeCriteria.trusted.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Premium Badge */}
          <div className="rounded-lg border-2 border-yellow-200 bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">⭐</span>
                <div>
                  <h3 className="text-xl font-semibold text-yellow-600">
                    {badgeCriteria.premium.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {badgeCriteria.premium.description}
                  </p>
                </div>
              </div>

              {eligibility.eligibility.premium.eligible ? (
                <button
                  onClick={() => handleApplyForBadge("PREMIUM")}
                  disabled={applyForBadge.isPending}
                  className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
                >
                  {applyForBadge.isPending ? "Applying..." : "Apply Now"}
                </button>
              ) : (
                <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">
                  Not Eligible
                </span>
              )}
            </div>

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Requirements:
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                {badgeCriteria.premium.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-600">⭐</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            {!eligibility.eligibility.premium.eligible && (
              <div className="rounded-lg bg-yellow-50 p-3">
                <p className="mb-1 text-sm font-medium text-yellow-800">
                  Missing Requirements:
                </p>
                <ul className="space-y-1 text-sm text-yellow-700">
                  {eligibility.eligibility.premium.missing.map((req, idx) => (
                    <li key={idx}>• {req}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Benefits:
              </p>
              <ul className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
                {badgeCriteria.premium.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Identity Verification Modal */}
      {showIdentityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">
              Request Identity Verification
            </h2>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Verification Method
              </label>
              <select
                value={identityMethod}
                onChange={(e) =>
                  setIdentityMethod(
                    e.target.value as
                      | "government_id"
                      | "business_license"
                      | "other",
                  )
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="government_id">Government ID</option>
                <option value="business_license">Business License</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Additional Notes (optional)
              </label>
              <textarea
                value={identityNotes}
                onChange={(e) => setIdentityNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Any additional information to help with verification..."
              />
            </div>

            <p className="mb-4 text-xs text-gray-600">
              An admin will review your request within 48 hours. You may be
              contacted for additional documentation.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowIdentityModal(false)}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestIdentityVerification}
                disabled={requestIdentityVerification.isPending}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {requestIdentityVerification.isPending
                  ? "Submitting..."
                  : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
