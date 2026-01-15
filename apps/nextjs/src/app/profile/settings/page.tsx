"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { api } from "~/trpc/react";

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: preferences, isLoading: preferencesLoading } =
    api.user.getPreferences.useQuery(undefined, {
      enabled: !!session,
    });

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    if (preferences) {
      setEmailNotifications(preferences.emailNotifications ?? true);
      setSmsNotifications(preferences.smsNotifications ?? true);
      setPushNotifications(preferences.pushNotifications ?? true);
      setLanguage(preferences.language || "en");
    }
  }, [preferences]);

  const updatePreferences = api.user.updatePreferences.useMutation({
    onSuccess: () => {
      // Show success message
      alert(t("settings.settingsSaved"));
    },
  });

  const handleSave = async () => {
    await updatePreferences.mutateAsync({
      emailNotifications,
      smsNotifications,
      pushNotifications,
      language,
    });
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);

    // Update URL locale
    const newPathname = pathname.replace(/^\/(en|fr|es)/, `/${newLang}`);
    router.push(newPathname);
  };

  if (sessionLoading || preferencesLoading) {
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
    <div className="mx-auto max-w-3xl px-4 py-8">
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
          {t("settings.settings")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("settings.managePreferences")}
        </p>
      </div>

      <div className="space-y-6">
        {/* Notification Preferences */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-xl font-semibold">
            {t("settings.notifications")}
          </h2>

          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="emailNotif" className="block font-medium text-gray-900">
                  {t("settings.emailNotifications")}
                </label>
                <p className="text-sm text-gray-600">
                  {t("settings.emailNotificationsHelp")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={emailNotifications}
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  emailNotifications ? "bg-green-600" : "bg-gray-200"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    emailNotifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex-1">
                <label htmlFor="smsNotif" className="block font-medium text-gray-900">
                  {t("settings.smsNotifications")}
                </label>
                <p className="text-sm text-gray-600">
                  {t("settings.smsNotificationsHelp")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={smsNotifications}
                onClick={() => setSmsNotifications(!smsNotifications)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  smsNotifications ? "bg-green-600" : "bg-gray-200"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    smsNotifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex-1">
                <label htmlFor="pushNotif" className="block font-medium text-gray-900">
                  {t("settings.pushNotifications")}
                </label>
                <p className="text-sm text-gray-600">
                  {t("settings.pushNotificationsHelp")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pushNotifications}
                onClick={() => setPushNotifications(!pushNotifications)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  pushNotifications ? "bg-green-600" : "bg-gray-200"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    pushNotifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            <p>
              💡 {t("settings.notificationNotice")}
            </p>
          </div>
        </div>

        {/* Language Preferences */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-xl font-semibold">
            {t("settings.language")}
          </h2>

          <div>
            <label htmlFor="language" className="mb-2 block font-medium text-gray-900">
              {t("settings.preferredLanguage")}
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
            <p className="mt-2 text-sm text-gray-600">
              {t("settings.languageHelp")}
            </p>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-xl font-semibold">
            {t("settings.privacySecurity")}
          </h2>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/auth/change-password")}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.changePassword")}</p>
                  <p className="text-xs text-gray-600">{t("settings.changePasswordHelp")}</p>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button
              onClick={() => router.push("/privacy-policy")}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.privacyPolicy")}</p>
                  <p className="text-xs text-gray-600">{t("settings.privacyPolicyHelp")}</p>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button
              onClick={() => router.push("/terms-of-service")}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("settings.termsOfService")}</p>
                  <p className="text-xs text-gray-600">{t("settings.termsOfServiceHelp")}</p>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="mb-4 text-xl font-semibold text-red-900">
            {t("settings.dangerZone")}
          </h2>

          <button
            onClick={() => {
              if (confirm(t("settings.deleteAccountConfirm"))) {
                // TODO: Implement account deletion
                alert(t("settings.deleteAccountPending"));
              }
            }}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            {t("settings.deleteAccount")}
          </button>
          <p className="mt-2 text-xs text-red-800">
            {t("settings.deleteAccountHelp")}
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={updatePreferences.isPending}
          className="w-full rounded-md bg-green-600 px-6 py-3 text-lg font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updatePreferences.isPending
            ? t("common.loading")
            : t("settings.saveSettings")}
        </button>

        {updatePreferences.isError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {updatePreferences.error.message}
          </div>
        )}
      </div>
    </div>
  );
}
