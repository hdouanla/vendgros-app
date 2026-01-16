import Link from "next/link";

import { AuthShowcase } from "./_components/auth-showcase";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasAuthError = params.error === "auth_required";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
      <main className="container max-w-4xl text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-green-900 sm:text-6xl">
          VendGros
        </h1>
        <p className="mb-8 text-xl text-gray-700">
          Buy and sell bulk items locally. Find deals near you!
        </p>

        {/* Authentication error message */}
        {hasAuthError && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm font-medium text-yellow-800">
              Please sign in to create a listing
            </p>
          </div>
        )}

        {/* Auth showcase - shows sign in/out button */}
        <div className="mb-8">
          <AuthShowcase />
        </div>

        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/listings/search"
            className="rounded-lg bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-green-700"
          >
            Browse Listings
          </Link>
          <Link
            href="/listings/create"
            className="rounded-lg border-2 border-green-600 bg-white px-8 py-4 text-lg font-semibold text-green-600 shadow-lg transition-colors hover:bg-green-50"
          >
            Post a Listing
          </Link>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 text-4xl">📍</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Find Local Deals
            </h3>
            <p className="text-gray-600">
              Search for bulk items near you with our geospatial search
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 text-4xl">💰</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Save Money
            </h3>
            <p className="text-gray-600">
              Buy in bulk and save with our secure 5% deposit system
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="mb-4 text-4xl">🤝</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Safe Transactions
            </h3>
            <p className="text-gray-600">
              QR code verification and ratings ensure safe pickups
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
