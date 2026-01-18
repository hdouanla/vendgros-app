"use client";

import { useState, useCallback } from "react";
import { api } from "~/trpc/react";

type UserStatus = "ALL" | "ACTIVE" | "SUSPENDED" | "BANNED";

// Notification state type
type Notification = {
  type: "success" | "error";
  message: string;
} | null;

export default function UserManagementPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus>("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>("");
  const [actionReason, setActionReason] = useState("");
  const [showActionModal, setShowActionModal] = useState<"suspend" | "ban" | "view" | "reactivate" | null>(null);
  const [notification, setNotification] = useState<Notification>(null);

  const utils = api.useUtils();

  // Auto-dismiss notification after 3 seconds
  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const { data: usersData, isLoading } = api.admin.getAllUsers.useQuery({
    limit: 50,
    offset: 0,
    search: search || undefined,
    status: statusFilter,
  });

  const { data: userDetails, isLoading: detailsLoading } = api.admin.getUserDetails.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId && showActionModal === "view" }
  );

  const suspendUser = api.admin.suspendUser.useMutation({
    onSuccess: () => {
      void utils.admin.getAllUsers.invalidate();
      setShowActionModal(null);
      setSelectedUserId(null);
      setSelectedUserEmail("");
      setActionReason("");
      showNotification("success", "User suspended successfully");
    },
    onError: (error) => {
      showNotification("error", error.message || "Failed to suspend user");
    },
  });

  const banUser = api.admin.banUser.useMutation({
    onSuccess: () => {
      void utils.admin.getAllUsers.invalidate();
      setShowActionModal(null);
      setSelectedUserId(null);
      setSelectedUserEmail("");
      setActionReason("");
      showNotification("success", "User banned permanently");
    },
    onError: (error) => {
      showNotification("error", error.message || "Failed to ban user");
    },
  });

  const reactivateUser = api.admin.reactivateUser.useMutation({
    onSuccess: () => {
      void utils.admin.getAllUsers.invalidate();
      setShowActionModal(null);
      setSelectedUserId(null);
      setSelectedUserEmail("");
      showNotification("success", "User reactivated successfully");
    },
    onError: (error) => {
      showNotification("error", error.message || "Failed to reactivate user");
    },
  });

  const handleSuspend = async () => {
    if (!selectedUserId || actionReason.length < 10) return;
    await suspendUser.mutateAsync({ userId: selectedUserId, reason: actionReason });
  };

  const handleBan = async () => {
    if (!selectedUserId || actionReason.length < 10) return;
    await banUser.mutateAsync({ userId: selectedUserId, reason: actionReason });
  };

  const handleReactivate = async () => {
    if (!selectedUserId) return;
    await reactivateUser.mutateAsync({ userId: selectedUserId });
  };

  const openActionModal = (userId: string, email: string, action: "suspend" | "ban" | "view" | "reactivate") => {
    setSelectedUserId(userId);
    setSelectedUserEmail(email);
    setShowActionModal(action);
    setActionReason("");
  };

  const closeModal = () => {
    setShowActionModal(null);
    setSelectedUserId(null);
    setSelectedUserEmail("");
    setActionReason("");
  };

  return (
    <div className="p-8">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-6 py-4 shadow-lg transition-all ${
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
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-gray-600">
          View and manage user accounts
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search by email
            </label>
            <input
              type="text"
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter email..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Status Filter */}
          <div className="w-48">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Account Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatus)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="ALL">All Users</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {usersData?.users.length ?? 0} of {usersData?.total ?? 0} users
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Verification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ratings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usersData?.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {user.phone && (
                          <p className="text-xs text-gray-400">{user.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          user.accountStatus === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : user.accountStatus === "SUSPENDED"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.accountStatus}
                      </span>
                      {user.isAdmin && (
                        <span className="ml-2 inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                          ADMIN
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          {user.emailVerified ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-400">○</span>
                          )}
                          <span className="text-xs text-gray-600">Email</span>
                        </div>
                        <div>
                          <span
                            className={`text-xs ${
                              user.verificationBadge === "NONE"
                                ? "text-gray-400"
                                : "text-blue-600 font-medium"
                            }`}
                          >
                            {user.verificationBadge}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        {(user.buyerRatingCount ?? 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-blue-600">Buyer:</span>
                            <span>⭐ {user.buyerRatingAverage?.toFixed(1)}</span>
                            <span className="text-gray-400">({user.buyerRatingCount})</span>
                          </div>
                        )}
                        {(user.sellerRatingCount ?? 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-green-600">Seller:</span>
                            <span>⭐ {user.sellerRatingAverage?.toFixed(1)}</span>
                            <span className="text-gray-400">({user.sellerRatingCount})</span>
                          </div>
                        )}
                        {(user.buyerRatingCount ?? 0) === 0 && (user.sellerRatingCount ?? 0) === 0 && (
                          <span className="text-gray-400">No ratings</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openActionModal(user.id, user.email, "view")}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View
                        </button>
                        {!user.isAdmin && (
                          <>
                            {user.accountStatus === "ACTIVE" && (
                              <>
                                <button
                                  onClick={() => openActionModal(user.id, user.email, "suspend")}
                                  className="text-yellow-600 hover:text-yellow-800 text-sm"
                                >
                                  Suspend
                                </button>
                                <button
                                  onClick={() => openActionModal(user.id, user.email, "ban")}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Ban
                                </button>
                              </>
                            )}
                            {user.accountStatus === "SUSPENDED" && (
                              <>
                                <button
                                  onClick={() => openActionModal(user.id, user.email, "reactivate")}
                                  disabled={reactivateUser.isPending}
                                  className="text-green-600 hover:text-green-800 text-sm"
                                >
                                  Reactivate
                                </button>
                                <button
                                  onClick={() => openActionModal(user.id, user.email, "ban")}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Ban
                                </button>
                              </>
                            )}
                            {user.accountStatus === "BANNED" && (
                              <span className="text-xs text-gray-400">Permanently banned</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {usersData?.users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No users found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal (Suspend/Ban) */}
      {(showActionModal === "suspend" || showActionModal === "ban") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {showActionModal === "suspend" ? "Suspend User" : "Ban User"}
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              {showActionModal === "suspend"
                ? "This will temporarily suspend the user's account. They will be notified and can appeal."
                : "This will permanently ban the user. All their listings and reservations will be cancelled."}
            </p>

            <div className="mb-4">
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason *
              </label>
              <textarea
                id="reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder="Explain the reason for this action..."
              />
              <p className="mt-1 text-xs text-gray-500">Minimum 10 characters required</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={showActionModal === "suspend" ? handleSuspend : handleBan}
                disabled={
                  actionReason.length < 10 ||
                  suspendUser.isPending ||
                  banUser.isPending
                }
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  showActionModal === "suspend"
                    ? "bg-yellow-600 hover:bg-yellow-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {suspendUser.isPending || banUser.isPending
                  ? "Processing..."
                  : showActionModal === "suspend"
                    ? "Suspend User"
                    : "Ban User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Confirmation Modal */}
      {showActionModal === "reactivate" && selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Reactivate User
            </h2>

            <p className="mb-4 text-gray-700">
              Are you sure you want to reactivate this user?
            </p>

            <div className="mb-6 rounded-md bg-gray-50 p-3">
              <p className="font-medium text-gray-900">{selectedUserEmail}</p>
            </div>

            <p className="mb-6 text-sm text-gray-500">
              This will restore the user's access to the platform. They will be able to create listings and make reservations again.
            </p>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivate}
                disabled={reactivateUser.isPending}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {reactivateUser.isPending ? "Reactivating..." : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      {showActionModal === "view" && selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-8 text-center text-gray-500">Loading details...</div>
            ) : userDetails ? (
              <div className="space-y-6">
                {/* User Info */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Account Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="ml-2 font-medium">{userDetails.user.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-2 font-medium">{userDetails.user.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <span className="ml-2 font-medium">{userDetails.user.phone ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className={`ml-2 font-medium ${
                        userDetails.user.accountStatus === "ACTIVE"
                          ? "text-green-600"
                          : userDetails.user.accountStatus === "SUSPENDED"
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}>
                        {userDetails.user.accountStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Badge:</span>
                      <span className="ml-2 font-medium">{userDetails.user.verificationBadge}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Joined:</span>
                      <span className="ml-2 font-medium">
                        {new Date(userDetails.user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {userDetails.user.moderationNotes && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded">
                      <span className="text-sm font-medium text-yellow-800">Moderation Notes:</span>
                      <p className="text-sm text-yellow-700 mt-1">{userDetails.user.moderationNotes}</p>
                    </div>
                  )}
                </div>

                {/* Listings */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Recent Listings ({userDetails.listings.length})
                  </h3>
                  {userDetails.listings.length > 0 ? (
                    <div className="space-y-2">
                      {userDetails.listings.map((listing) => (
                        <div
                          key={listing.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{listing.title}</p>
                            <p className="text-xs text-gray-500">
                              {listing.category} • ${listing.pricePerPiece?.toFixed(2)}
                            </p>
                          </div>
                          <span
                            className={`text-xs rounded-full px-2 py-1 ${
                              listing.status === "PUBLISHED"
                                ? "bg-green-100 text-green-800"
                                : listing.status === "PENDING_REVIEW"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {listing.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No listings</p>
                  )}
                </div>

                {/* Reservations */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Recent Orders ({userDetails.buyerReservations.length})
                  </h3>
                  {userDetails.buyerReservations.length > 0 ? (
                    <div className="space-y-2">
                      {userDetails.buyerReservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                        >
                          <div>
                            <p className="text-sm text-gray-900">
                              {reservation.quantityReserved} items • ${reservation.totalPrice?.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(reservation.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span
                            className={`text-xs rounded-full px-2 py-1 ${
                              reservation.status === "COMPLETED"
                                ? "bg-green-100 text-green-800"
                                : reservation.status === "CONFIRMED"
                                  ? "bg-blue-100 text-blue-800"
                                  : reservation.status === "CANCELLED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {reservation.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No orders</p>
                  )}
                </div>

                {/* Ratings Received */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Ratings Received ({userDetails.ratingsReceived.length})
                  </h3>
                  {userDetails.ratingsReceived.length > 0 ? (
                    <div className="space-y-2">
                      {userDetails.ratingsReceived.map((rating) => (
                        <div
                          key={rating.id}
                          className="rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-yellow-500">
                              {"⭐".repeat(rating.score)}
                            </span>
                            <span className="text-sm text-gray-600">
                              {rating.score}/5
                            </span>
                          </div>
                          {rating.comment && (
                            <p className="text-sm text-gray-700">{rating.comment}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(rating.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No ratings</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">User not found</div>
            )}

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={closeModal}
                className="w-full rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
