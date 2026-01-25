"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export default function ProfilePage() {
  const router = useRouter();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tSettings = useTranslations("settings");

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: currentUser, isLoading: userLoading } = api.user.getCurrentUser.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  if (sessionLoading || userLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{tCommon("loading")}</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/profile"));
    return null;
  }

  // Use currentUser for full profile data, fall back to session.user for basic info
  const user = currentUser ?? session.user;

  // Helper to check if we have the full user profile
  const hasFullProfile = !!currentUser;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("myProfile")}
        </h1>
        <button
          onClick={() => router.push("/profile/edit")}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {t("editProfile")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {t("basicInfo")}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("name")}
                </label>
                <p className="mt-1 text-gray-900">{user.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("email")}
                </label>
                <p className="mt-1 text-gray-900">{user.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("phone")}
                </label>
                {currentUser?.phone ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-gray-900">
                      {currentUser.phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        currentUser.phoneVerified
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {currentUser.phoneVerified ? (
                        <>
                          <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {t("verified")}
                        </>
                      ) : (
                        t("notVerified")
                      )}
                    </span>
                    {!currentUser.phoneVerified && (
                      <Link
                        href="/auth/verify-phone"
                        className="text-sm font-medium text-green-600 hover:text-green-500"
                      >
                        {t("verify")}
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-gray-500 italic">{t("notSet")}</span>
                    <Link
                      href="/profile/edit"
                      className="text-sm font-medium text-green-600 hover:text-green-500"
                    >
                      {t("addPhone")}
                    </Link>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("memberSince", { date: "" })}
                </label>
                <p className="mt-1 text-gray-900">
                  {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              {t("accountActions")}
            </h2>

            <div className="space-y-3">
              <button
                onClick={() => router.push("/seller")}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                {t("goToSellerDashboard")}
              </button>

              <button
                onClick={() => router.push("/reservations")}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("viewMyReservations")}
              </button>

              <button
                onClick={() => router.push("/profile/likes")}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("viewMyLikes")}
              </button>

              <button
                onClick={() => router.push("/profile/favorites")}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("viewMyFavorites")}
              </button>

              <button
                onClick={() => router.push("/profile/settings")}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t("accountSettings")}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Stats & Rating */}
        <div className="space-y-6">
          {/* Rating Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold">
              {t("rating")}
            </h2>

            <div className="text-center">
              <div className="mb-2 text-5xl font-bold text-green-600">
                {currentUser?.ratingAverage?.toFixed(1) ?? "—"}
              </div>
              <div className="mb-4 flex justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-2xl ${
                      star <= Math.round(currentUser?.ratingAverage || 0)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  >
                    ⭐
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-600">
                {currentUser?.ratingCount ?? 0} {currentUser?.ratingCount === 1 ? t('review') : t('reviews')}
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold">
              {t("accountStatus")}
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  {t("emailVerified")}
                </span>
                <span className="font-semibold text-gray-900">
                  {currentUser?.emailVerified ? (
                    <span className="text-green-600">{t("yes")}</span>
                  ) : (
                    <span className="text-yellow-600">{t("no")}</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  {t("phoneVerified")}
                </span>
                <span className="font-semibold text-gray-900">
                  {currentUser?.phoneVerified ? (
                    <span className="text-green-600">{t("yes")}</span>
                  ) : (
                    <span className="text-yellow-600">{t("no")}</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  {t("verification")}
                </span>
                <span className="font-semibold text-gray-900">
                  {currentUser?.verificationBadge === "NONE" ? t("standard") : currentUser?.verificationBadge ?? t("standard")}
                </span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="text-sm text-gray-600">
                  {t("status")}
                </span>
                <span className="font-semibold text-green-600">
                  {currentUser?.accountStatus ?? 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
