"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

type Notification = {
  type: "success" | "error";
  message: string;
} | null;

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  NO_SHOW: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

type SelectedUser = {
  id: string;
  name: string | null;
  email: string;
} | null;

function UserSearchAutocomplete({
  label,
  placeholder,
  selectedUser,
  onSelect,
  onClear,
}: {
  label: string;
  placeholder: string;
  selectedUser: SelectedUser;
  onSelect: (user: NonNullable<SelectedUser>) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: users, isLoading } = api.admin.searchUsers.useQuery(
    { search: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 },
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selectedUser) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1 flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2">
          <span className="flex-1 truncate text-sm">
            {selectedUser.name || selectedUser.email}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
      />
      {isOpen && debouncedSearch.length >= 2 && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
          ) : users && users.length > 0 ? (
            users.map((user) => (
              <button
                key={user.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => {
                  onSelect(user);
                  setSearch("");
                  setIsOpen(false);
                }}
              >
                <div className="font-medium">{user.name || "No name"}</div>
                <div className="text-gray-500">{user.email}</div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminReservationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED"
  >("ALL");
  const [selectedSeller, setSelectedSeller] = useState<SelectedUser>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<SelectedUser>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [notification, setNotification] = useState<Notification>(null);

  const limit = 20;

  const showNotification = useCallback(
    (type: "success" | "error", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 3000);
    },
    [],
  );

  // Reset page on filter change
  useEffect(() => {
    setPage(0);
  }, [status, selectedSeller, selectedBuyer, search, dateFrom, dateTo]);

  const { data: session, isLoading: sessionLoading } =
    api.auth.getSession.useQuery();

  const { data: reservationsData, isLoading: reservationsLoading } =
    api.admin.getAllReservations.useQuery(
      {
        limit,
        offset: page * limit,
        status,
        sellerId: selectedSeller?.id,
        buyerId: selectedBuyer?.id,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      },
      {
        enabled: !!session?.user,
      },
    );

  if (sessionLoading || reservationsLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push(
      "/auth/signin?callbackUrl=" + encodeURIComponent("/admin/reservations"),
    );
    return null;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setSelectedSeller(null);
    setSelectedBuyer(null);
    setDateFrom("");
    setDateTo("");
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
        <h1 className="text-3xl font-bold text-gray-900">Reservations</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage all buyer reservations. Total: {reservationsData?.total ?? 0}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div>
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
                placeholder="ID, code, or listing title..."
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              />
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700"
              >
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="NO_SHOW">No Show</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Seller Search */}
            <UserSearchAutocomplete
              label="Seller"
              placeholder="Search by email or name..."
              selectedUser={selectedSeller}
              onSelect={setSelectedSeller}
              onClear={() => setSelectedSeller(null)}
            />

            {/* Buyer Search */}
            <UserSearchAutocomplete
              label="Buyer"
              placeholder="Search by email or name..."
              selectedUser={selectedBuyer}
              onSelect={setSelectedBuyer}
              onClear={() => setSelectedBuyer(null)}
            />

            {/* Date From */}
            <div>
              <label
                htmlFor="dateFrom"
                className="block text-sm font-medium text-gray-700"
              >
                From Date
              </label>
              <input
                type="date"
                id="dateFrom"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label
                htmlFor="dateTo"
                className="block text-sm font-medium text-gray-700"
              >
                To Date
              </label>
              <input
                type="date"
                id="dateTo"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </form>
      </div>

      {/* Reservations Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Verification Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Listing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Buyer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Qty / Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reservationsData?.reservations && reservationsData.reservations.length > 0 ? (
                reservationsData.reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link
                        href={`/admin/reservations/${reservation.id}`}
                        className="font-mono font-medium text-green-600 hover:text-green-800"
                      >
                        {reservation.verificationCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-sm font-medium text-gray-900">
                        {reservation.listing.title}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {reservation.buyer.name || "No name"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reservation.buyer.email}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {reservation.listing.seller.name || "No name"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reservation.listing.seller.email}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColors[reservation.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {reservation.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <div>{reservation.quantityReserved} units</div>
                      <div className="text-gray-500">
                        ${reservation.totalPrice.toFixed(2)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(reservation.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Link
                        href={`/admin/reservations/${reservation.id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No reservations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {reservationsData && reservationsData.total > limit && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {page * limit + 1} to{" "}
            {Math.min((page + 1) * limit, reservationsData.total)} of{" "}
            {reservationsData.total} results
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
              disabled={!reservationsData.hasMore}
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
