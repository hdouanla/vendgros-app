"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { signOut } from "@acme/auth/client";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();

  if (sessionLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/profile/settings"));
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

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
          Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900">
          Account Settings
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your account preferences and security
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-xl font-semibold">
            Account Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">
                Name
              </label>
              <p className="mt-1 text-gray-900">{session.user.name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Email
              </label>
              <p className="mt-1 text-gray-900">{session.user.email}</p>
            </div>

            <button
              onClick={() => router.push("/profile/edit")}
              className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-xl font-semibold">
            Privacy & Security
          </h2>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/privacy-policy")}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Privacy Policy</p>
                  <p className="text-xs text-gray-600">View our privacy policy</p>
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
                  <p className="font-medium">Terms of Service</p>
                  <p className="text-xs text-gray-600">View our terms of service</p>
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

        {/* Account Actions */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-6 text-xl font-semibold">
            Account Actions
          </h2>

          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="mb-4 text-xl font-semibold text-red-900">
            Danger Zone
          </h2>

          <button
            onClick={() => {
              if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
                alert("Account deletion is not yet implemented. Please contact support.");
              }
            }}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete Account
          </button>
          <p className="mt-2 text-xs text-red-800">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
}
