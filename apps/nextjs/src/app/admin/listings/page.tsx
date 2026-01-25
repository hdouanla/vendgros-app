"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "~/trpc/react";

type Notification = {
  type: "success" | "error";
  message: string;
} | null;

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  PUBLISHED: "bg-green-100 text-green-800",
  RESERVED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-purple-100 text-purple-800",
  EXPIRED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export default function AdminListingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    | "ALL"
    | "DRAFT"
    | "PENDING_REVIEW"
    | "PUBLISHED"
    | "RESERVED"
    | "COMPLETED"
    | "EXPIRED"
    | "CANCELLED"
  >("ALL");
  const [featured, setFeatured] = useState<"ALL" | "FEATURED" | "NOT_FEATURED">(
    "ALL",
  );
  const [page, setPage] = useState(0);
  const [notification, setNotification] = useState<Notification>(null);

  const limit = 20;
  const utils = api.useUtils();

  const showNotification = useCallback(
    (type: "success" | "error", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 3000);
    },
    [],
  );

  const { data: session, isLoading: sessionLoading } =
    api.auth.getSession.useQuery();

  const { data: listingsData, isLoading: listingsLoading } =
    api.admin.getAllListings.useQuery(
      {
        limit,
        offset: page * limit,
        search: search || undefined,
        status,
        featured,
      },
      {
        enabled: !!session?.user,
      },
    );

  const toggleFeatured = api.admin.toggleFeatured.useMutation({
    onSuccess: (data) => {
      void utils.admin.getAllListings.invalidate();
      showNotification(
        "success",
        data?.isFeatured
          ? "Listing marked as featured"
          : "Listing removed from featured",
      );
    },
    onError: (error) => {
      showNotification("error", error.message || "Failed to update listing");
    },
  });

  if (sessionLoading || listingsLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push(
      "/auth/signin?callbackUrl=" + encodeURIComponent("/admin/listings"),
    );
    return null;
  }

  const handleToggleFeatured = (listingId: string, currentStatus: boolean) => {
    toggleFeatured.mutate({
      listingId,
      isFeatured: !currentStatus,
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-6 py-4 shadow-lg transition-all ${
            notification.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === "success" ? "✓" : "✕"}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">All Listings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage all listings and featured status. Total:{" "}
          {listingsData?.total ?? 0}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700"
            >
              Search
            </label>
            <input
              type="text"
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            />
          </div>

          <div className="w-48">
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setPage(0);
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="PUBLISHED">Published</option>
              <option value="RESERVED">Reserved</option>
              <option value="COMPLETED">Completed</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="w-48">
            <label
              htmlFor="featured"
              className="block text-sm font-medium text-gray-700"
            >
              Featured
            </label>
            <select
              id="featured"
              value={featured}
              onChange={(e) => {
                setFeatured(e.target.value as typeof featured);
                setPage(0);
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            >
              <option value="ALL">All</option>
              <option value="FEATURED">Featured Only</option>
              <option value="NOT_FEATURED">Not Featured</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Listings Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Listing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Seller
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Published
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Featured
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {listingsData?.listings && listingsData.listings.length > 0 ? (
              listingsData.listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      {listing.photos && listing.photos[0] && (
                        <div className="relative mr-3 h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                          <Image
                            src={listing.photos[0]}
                            alt={listing.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div className="max-w-xs truncate font-medium text-gray-900">
                          {listing.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {listing.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {listing.seller.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {listing.seller.email}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColors[listing.status] || "bg-gray-100 text-gray-800"}`}
                    >
                      {listing.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    ${listing.pricePerPiece.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {listing.publishedAt
                      ? new Date(listing.publishedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <button
                      onClick={() =>
                        handleToggleFeatured(listing.id, listing.isFeatured)
                      }
                      disabled={
                        toggleFeatured.isPending ||
                        listing.status !== "PUBLISHED"
                      }
                      className={`rounded-full p-2 transition-colors ${
                        listing.isFeatured
                          ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                      title={
                        listing.status !== "PUBLISHED"
                          ? "Only published listings can be featured"
                          : listing.isFeatured
                            ? "Remove from featured"
                            : "Mark as featured"
                      }
                    >
                      <svg
                        className="h-5 w-5"
                        fill={listing.isFeatured ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      href={`/listing/${listing.id}`}
                      className="text-green-600 hover:text-green-900"
                      target="_blank"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No listings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {listingsData && listingsData.total > limit && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {page * limit + 1} to{" "}
            {Math.min((page + 1) * limit, listingsData.total)} of{" "}
            {listingsData.total} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!listingsData.hasMore}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
