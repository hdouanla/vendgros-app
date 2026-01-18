"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function ProfilePage() {
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
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/profile"));
    return null;
  }

  const user = session.user;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          My Profile
        </h1>
        <button
          onClick={() => router.push("/profile/edit")}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Name
                </label>
                <p className="mt-1 text-gray-900">{user.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Email
                </label>
                <p className="mt-1 text-gray-900">{user.email}</p>
              </div>

              {user.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Phone
                  </label>
                  <p className="mt-1 text-gray-900">{user.phone}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Member Since
                </label>
                <p className="mt-1 text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-xl font-semibold">
              Account Actions
            </h2>

            <div className="space-y-3">
              <button
                onClick={() => router.push("/seller/dashboard")}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Go to Seller Dashboard
              </button>

              <button
                onClick={() => router.push("/reservations")}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View My Reservations
              </button>

              <button
                onClick={() => router.push("/profile/settings")}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Account Settings
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Stats & Rating */}
        <div className="space-y-6">
          {/* Rating Card */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold">
              Rating
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
                {user.ratingCount} {user.ratingCount === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold">
              Account Status
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Email Verified
                </span>
                <span className="font-semibold text-gray-900">
                  {user.emailVerified ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-yellow-600">No</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Account Type
                </span>
                <span className="font-semibold text-gray-900">
                  {user.userType || 'BUYER'}
                </span>
              </div>

              <div className="flex justify-between border-t pt-3">
                <span className="text-sm text-gray-600">
                  Status
                </span>
                <span className="font-semibold text-green-600">
                  {user.accountStatus || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
