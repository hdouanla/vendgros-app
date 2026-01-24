"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export default function EditProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const t = useTranslations("profile");

  const redirectUrl = searchParams.get("redirect");

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: currentUser, isLoading: userLoading } = api.user.getCurrentUser.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");

  // Format phone number as (555) 555-5555
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");

    // Limit to 10 digits
    const limited = digits.slice(0, 10);

    // Format based on length
    if (limited.length === 0) return "";
    if (limited.length <= 3) return `(${limited}`;
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };
  const [languagePreference, setLanguagePreference] = useState<"en" | "fr" | "es">("en");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize form with current user data
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      // Convert +1XXXXXXXXXX to (XXX) XXX-XXXX for display
      const phoneDigits = currentUser.phone?.replace(/\D/g, "").slice(-10) ?? "";
      const formattedPhone = formatPhoneNumber(phoneDigits);
      setPhone(formattedPhone);
      setOriginalPhone(formattedPhone);
      setLanguagePreference(currentUser.languagePreference as "en" | "fr" | "es");
    }
  }, [currentUser]);

  // Check if phone has changed (for warning display)
  const phoneHasChanged = phone !== originalPhone && originalPhone !== "";

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      void utils.user.getCurrentUser.invalidate();
      void utils.auth.getSession.invalidate();
      void utils.phoneVerification.getStatus.invalidate();
      // Redirect after short delay to show success message
      setTimeout(() => {
        router.push(redirectUrl ?? "/profile");
      }, 1500);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    // Format phone number if provided
    let formattedPhone: string | null = null;
    if (phone.trim()) {
      // Remove all non-digits
      const digits = phone.replace(/\D/g, "");
      if (digits.length === 10) {
        formattedPhone = `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith("1")) {
        formattedPhone = `+${digits}`;
      } else {
        setError("Please enter a valid 10-digit phone number");
        return;
      }
    }

    updateProfile.mutate({
      name: name.trim(),
      phone: formattedPhone,
      languagePreference,
    });
  };

  if (sessionLoading || userLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/profile/edit"));
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
          Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
        <p className="mt-2 text-sm text-gray-600">
          Update your profile information
        </p>
      </div>

      {/* Phone Verification Alert */}
      {currentUser && !currentUser.phoneVerified && (
        <div className="mb-8 rounded-xl border-2 border-amber-400 bg-amber-50 p-6 shadow-md">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 rounded-full bg-amber-100 p-3">
              <svg className="h-8 w-8 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-amber-800">
                {t("phoneVerificationRequired")}
              </h3>
              <p className="mt-2 text-base text-amber-700">
                {t("phoneVerificationAlertMessage")}
              </p>
              {currentUser.phone ? (
                <Link
                  href={`/auth/verify-phone${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
                  className="mt-4 inline-flex items-center rounded-lg bg-amber-600 px-5 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
                >
                  {t("verifyNow")}
                  <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <p className="mt-3 text-base font-medium text-amber-800">
                  {t("addPhoneFirst")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-medium">Profile updated successfully!</p>
          <p className="text-sm">Redirecting to profile...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-md">
        <div className="space-y-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Your name"
              required
            />
          </div>

          {/* Email Field (Read-only) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={currentUser?.email ?? ""}
              disabled
              className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 shadow-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          {/* Phone Field */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              {currentUser?.phone && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                      Verified
                    </>
                  ) : (
                    "Not Verified"
                  )}
                </span>
              )}
            </div>
            <div className="mt-1 flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                +1
              </span>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                className="block w-full rounded-r-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="(555) 555-5555"
                maxLength={14}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Canadian phone number format. Used for SMS notifications.
            </p>

            {/* Phone change warning */}
            {phoneHasChanged && (
              <div className="mt-2 rounded-md bg-yellow-50 p-3">
                <div className="flex">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Changing your phone number will require re-verification.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Verify Now link */}
            {currentUser?.phone && !currentUser.phoneVerified && !phoneHasChanged && (
              <Link
                href={`/auth/verify-phone${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
                className="mt-2 inline-flex items-center text-sm font-medium text-green-600 hover:text-green-500"
              >
                Verify Now
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            )}
          </div>

          {/* Language Preference */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700">
              Language Preference
            </label>
            <select
              id="language"
              value={languagePreference}
              onChange={(e) => setLanguagePreference(e.target.value as "en" | "fr" | "es")}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="en">English</option>
              <option value="fr">Fran&ccedil;ais</option>
              <option value="es">Espa&ntilde;ol</option>
            </select>
          </div>

          {/* Account Info (Read-only) */}
          <div className="border-t pt-6">
            <h3 className="mb-4 text-sm font-medium text-gray-700">Account Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Email Verified:</span>
                <span className={`ml-2 font-medium ${currentUser?.emailVerified ? "text-green-600" : "text-yellow-600"}`}>
                  {currentUser?.emailVerified ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Phone Verified:</span>
                <span className={`ml-2 font-medium ${currentUser?.phoneVerified ? "text-green-600" : "text-yellow-600"}`}>
                  {currentUser?.phoneVerified ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Verification Badge:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {currentUser?.verificationBadge === "NONE" ? "Standard" : currentUser?.verificationBadge}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Account Status:</span>
                <span className="ml-2 font-medium text-green-600">
                  {currentUser?.accountStatus}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Member Since:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-gray-300 px-6 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="flex-1 rounded-md bg-green-600 px-6 py-3 text-lg font-medium text-white hover:bg-green-700 disabled:bg-green-400"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
