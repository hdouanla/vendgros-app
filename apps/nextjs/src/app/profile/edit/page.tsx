"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function EditProfilePage() {
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

        <h1 className="text-3xl font-bold text-gray-900">
          Edit Profile
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Profile editing is coming soon
        </p>
      </div>

      {/* Current Profile Info */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-semibold">Current Information</h2>

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

          {session.user.phone && (
            <div>
              <label className="text-sm font-medium text-gray-600">
                Phone
              </label>
              <p className="mt-1 text-gray-900">{session.user.phone}</p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-medium">ℹ️ Profile Editing Coming Soon</p>
          <p className="mt-1 text-xs">
            The ability to edit your profile is currently under development.
            If you need to update your information, please contact support.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full rounded-md border border-gray-300 px-6 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Profile
        </button>
      </div>
    </div>
  );
}
