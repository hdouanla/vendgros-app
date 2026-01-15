"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function EditProfilePage() {
  const t = useTranslations();
  const router = useRouter();

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();

  const [email, setEmail] = useState(session?.user?.email || "");
  const [phone, setPhone] = useState(session?.user?.phone || "");
  const [businessName, setBusinessName] = useState(session?.user?.businessName || "");
  const [accountType, setAccountType] = useState<"INDIVIDUAL" | "BUSINESS">(
    session?.user?.accountType || "INDIVIDUAL"
  );

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      router.push("/profile");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateProfile.mutateAsync({
      email,
      phone: phone.trim() || undefined,
      businessName: accountType === "BUSINESS" ? businessName.trim() || undefined : undefined,
      accountType,
    });
  };

  if (sessionLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin");
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t("common.back")}
        </button>

        <h1 className="text-3xl font-bold text-gray-900">
          {t("profile.editProfile")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("profile.updateInfo")}
        </p>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-md">
          {/* Account Type */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              {t("profile.accountType")} *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setAccountType("INDIVIDUAL")}
                className={`rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  accountType === "INDIVIDUAL"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t("profile.accountType.individual")}
              </button>
              <button
                type="button"
                onClick={() => setAccountType("BUSINESS")}
                className={`rounded-md border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  accountType === "BUSINESS"
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t("profile.accountType.business")}
              </button>
            </div>
          </div>

          {/* Email */}
          <div className="mb-6">
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
              {t("profile.email")} *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              placeholder="your@email.com"
            />
          </div>

          {/* Phone */}
          <div className="mb-6">
            <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-gray-700">
              {t("profile.phone")}
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              placeholder="+1 (555) 123-4567"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t("profile.phoneHelp")}
            </p>
          </div>

          {/* Business Name (conditional) */}
          {accountType === "BUSINESS" && (
            <div className="mb-6">
              <label htmlFor="businessName" className="mb-2 block text-sm font-semibold text-gray-700">
                {t("profile.businessName")}
              </label>
              <input
                type="text"
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                placeholder="Your Business Inc."
              />
              <p className="mt-1 text-xs text-gray-500">
                {t("profile.businessNameHelp")}
              </p>
            </div>
          )}

          {/* Information Notice */}
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-medium">ℹ️ {t("profile.emailChangeNotice")}</p>
            <p className="mt-1 text-xs">{t("profile.emailChangeHelp")}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-gray-300 px-6 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={updateProfile.isPending || !email}
            className="flex-1 rounded-md bg-green-600 px-6 py-3 text-lg font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updateProfile.isPending
              ? t("common.loading")
              : t("profile.saveChanges")}
          </button>
        </div>

        {updateProfile.isError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {updateProfile.error.message}
          </div>
        )}
      </form>
    </div>
  );
}
