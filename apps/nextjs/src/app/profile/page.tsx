"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function ProfilePage() {
  const t = useTranslations();
  const router = useRouter();

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: userStats } = api.user.getStats.useQuery(
    undefined,
    {
      enabled: !!session,
    }
  );

  if (sessionLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/profile"));
    return null;
  }

  const user = session.user;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("profile.myProfile")}
        </h1>
        <button
          onClick={() => router.push("/profile/edit")}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {t("profile.editProfile")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {t("profile.basicInfo")}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("profile.email")}
                </label>
                <p className="mt-1 text-gray-900">{user.email}</p>
              </div>

              {user.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    {t("profile.phone")}
                  </label>
                  <p className="mt-1 text-gray-900">{user.phone}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("profile.accountType")}
                </label>
                <div className="mt-1 flex items-center">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      user.accountType === "BUSINESS"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {t(`profile.accountType.${user.accountType?.toLowerCase() || "individual"}`)}
                  </span>
                </div>
              </div>

              {user.businessName && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    {t("profile.businessName")}
                  </label>
                  <p className="mt-1 text-gray-900">{user.businessName}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("profile.memberSince")}
                </label>
                <p className="mt-1 text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {t("profile.transactionHistory")}
            </h2>

            {userStats?.recentTransactions && userStats.recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {userStats.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between border-b pb-4 last:border-b-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {transaction.listing.title}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${transaction.totalPrice.toFixed(2)}
                      </p>
                      <span
                        className={`inline-flex text-xs font-semibold ${
                          transaction.status === "CONFIRMED"
                            ? "text-green-600"
                            : transaction.status === "PENDING"
                              ? "text-yellow-600"
                              : "text-gray-600"
                        }`}
                      >
                        {t(`reservation.status.${transaction.status.toLowerCase()}`)}
                      </span>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => router.push("/reservations")}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t("profile.viewAllTransactions")}
                </button>
              </div>
            ) : (
              <p className="text-center text-gray-600">
                {t("profile.noTransactions")}
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Stats & Rating */}
        <div className="space-y-6">
          {/* Rating Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold">
              {t("profile.rating")}
            </h2>

            <div className="text-center">
              <div className="mb-2 text-5xl font-bold text-green-600">
                {user.ratingAverage?.toFixed(1) ?? "—"}
              </div>
              <div className="mb-4 flex justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-2xl ${
                      star <= Math.round(user.ratingAverage || 0)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  >
                    ⭐
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-600">
                {user.ratingCount} {t("profile.reviews")}
              </p>
            </div>
          </div>

          {/* Stats Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold">
              {t("profile.statistics")}
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  {t("profile.totalListings")}
                </span>
                <span className="font-semibold text-gray-900">
                  {userStats?.totalListings ?? 0}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  {t("profile.activeListings")}
                </span>
                <span className="font-semibold text-gray-900">
                  {userStats?.activeListings ?? 0}
                </span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="text-sm text-gray-600">
                  {t("profile.totalSales")}
                </span>
                <span className="font-semibold text-gray-900">
                  {userStats?.totalSales ?? 0}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  {t("profile.totalPurchases")}
                </span>
                <span className="font-semibold text-gray-900">
                  {userStats?.totalPurchases ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold">
              {t("profile.quickActions")}
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => router.push("/listings/new")}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                {t("listing.createListing")}
              </button>

              <button
                onClick={() => router.push("/listings/my-listings")}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("listing.myListings")}
              </button>

              <button
                onClick={() => router.push("/reservations")}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("reservation.myReservations")}
              </button>

              <button
                onClick={() => router.push("/profile/settings")}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("profile.settings")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
