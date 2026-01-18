"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import Link from "next/link";
import { ListingForm } from "~/components/listings/listing-form";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmationModal } from "~/components/ui/confirmation-modal";

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingIsActive, setPendingIsActive] = useState<boolean | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: session, isLoading: sessionLoading } =
    api.auth.getSession.useQuery();

  const { data: listing, isLoading: listingLoading } =
    api.listing.getById.useQuery({ id }, { enabled: !!session?.user });

  // Check if listing has active reservations (CONFIRMED or PENDING)
  const { data: reservationsData } = api.reservation.getByListingId.useQuery(
    { listingId: id },
    { enabled: !!listing }
  );

  const hasActiveReservations = reservationsData
    ? reservationsData.some(
        (r) => r.status === "CONFIRMED" || r.status === "PENDING"
      )
    : false;

  // Keep old variable for backward compatibility with locked editing
  const hasReservations = hasActiveReservations;

  // Duplicate listing mutation
  const duplicateMutation = api.listing.duplicate.useMutation({
    onSuccess: (data) => {
      router.push(`/seller/listings/${data.id}/edit`);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleDuplicate = () => {
    setShowDuplicateModal(true);
  };

  const confirmDuplicate = () => {
    duplicateMutation.mutate({ listingId: id });
    setShowDuplicateModal(false);
  };

  // Delete listing mutation
  const deleteMutation = api.listing.delete.useMutation({
    onSuccess: () => {
      router.push("/seller/dashboard");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate({ listingId: id });
    setShowDeleteModal(false);
  };

  // Toggle listing active state mutation
  const toggleActiveMutation = api.listing.update.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh the listing data
      queryClient.invalidateQueries();
      setShowStatusModal(false);
      setPendingIsActive(null);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
      setShowStatusModal(false);
      setPendingIsActive(null);
    },
  });

  const handleToggleActive = (isActive: boolean) => {
    setPendingIsActive(isActive);
    setShowStatusModal(true);
  };

  const confirmToggleActive = () => {
    if (pendingIsActive !== null) {
      toggleActiveMutation.mutate({
        listingId: id,
        data: { isActive: pendingIsActive },
      });
    }
  };

  if (sessionLoading || listingLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push(`/auth/signin?callbackUrl=/seller/listings/${id}/edit`);
    return null;
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-gray-600">Listing not found</p>
      </div>
    );
  }

  // Check if user is the seller
  if (listing.sellerId !== session.user.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-red-600">
          You are not authorized to edit this listing
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/seller"
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Listing</h1>
            <p className="mt-2 text-sm text-gray-600">
              {hasReservations
                ? "This listing has reservations and cannot be edited"
                : "Update your listing details"}
            </p>
          </div>
          {/* Status Badge */}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              listing.status === "ACTIVE" || listing.status === "PUBLISHED"
                ? "bg-green-100 text-green-800"
                : listing.status === "PENDING_REVIEW"
                  ? "bg-yellow-100 text-yellow-800"
                  : listing.status === "DRAFT"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-red-100 text-red-800"
            }`}
          >
            {listing.status}
          </span>
        </div>
      </div>

      {/* Stock Progress Bar */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-900">
          Inventory Status
        </h3>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Available: {listing.quantityAvailable} / {listing.quantityTotal} units</span>
          <span className="font-medium">
            {Math.round((listing.quantityAvailable / listing.quantityTotal) * 100)}% remaining
          </span>
        </div>
        <div className="mt-2 h-4 w-full overflow-hidden rounded-lg bg-gray-200">
          <div
            className={`h-full transition-all ${
              (listing.quantityAvailable / listing.quantityTotal) * 100 > 70
                ? "bg-green-500"
                : (listing.quantityAvailable / listing.quantityTotal) * 100 > 30
                  ? "bg-yellow-500"
                  : (listing.quantityAvailable / listing.quantityTotal) * 100 > 10
                    ? "bg-orange-500"
                    : "bg-red-500"
            }`}
            style={{
              width: `${(listing.quantityAvailable / listing.quantityTotal) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Status Toggle - Only show for PUBLISHED listings */}
      {listing.status === "PUBLISHED" && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Listing Visibility
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {listing.isActive
                  ? "Your listing is visible to buyers and accepting reservations"
                  : "Your listing is hidden from buyers and not accepting reservations"}
              </p>
            </div>
            <button
              onClick={() => handleToggleActive(!listing.isActive)}
              disabled={toggleActiveMutation.isPending}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                listing.isActive
                  ? "border border-red-300 bg-white text-red-700 hover:bg-red-50"
                  : "border border-green-300 bg-white text-green-700 hover:bg-green-50"
              }`}
            >
              {toggleActiveMutation.isPending
                ? "Updating..."
                : listing.isActive
                  ? "Deactivate Listing"
                  : "Activate Listing"}
            </button>
          </div>
        </div>
      )}

      {/* Form Container - matches create page styling */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <ListingForm
          mode="edit"
          initialData={listing}
          listingId={id}
          hasReservations={hasReservations}
          onDuplicate={handleDuplicate}
          onViewAsBuyer={() => router.push(`/listings/${id}`)}
        />
      </div>

      {/* Info box for listings without reservations */}
      {!hasReservations && (
        <div className="mt-8 rounded-lg bg-blue-50 p-4">
          <h3 className="text-sm font-medium text-blue-900">
            Editing Guidelines:
          </h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>You can edit all fields freely until someone makes a reservation</li>
            <li>
              {listing.status === "PUBLISHED"
                ? "Changing title, description, category, price, or address requires re-review"
                : "Save as draft or submit for review when ready"}
            </li>
            <li>
              Updating photos, quantity, or visibility doesn't require re-review
            </li>
            <li>
              Deactivating temporarily hides your listing without changing its status
            </li>
            <li>
              Once a reservation is made, you must create a copy to make changes
            </li>
          </ul>
        </div>
      )}

      {/* Delete Listing - Available when there are no reservations */}
      {!hasReservations && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
          <h3 className="text-sm font-medium text-red-900">
            Danger Zone
          </h3>
          <p className="mt-2 text-sm text-red-800">
            Delete this listing permanently. This action cannot be undone.
          </p>
          <button
            onClick={handleDelete}
            className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete Listing
          </button>
        </div>
      )}

      {/* Status Toggle Confirmation Modal */}
      <ConfirmationModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setPendingIsActive(null);
        }}
        onConfirm={confirmToggleActive}
        title={
          pendingIsActive === false
            ? "Deactivate Listing"
            : "Activate Listing"
        }
        message={
          pendingIsActive === false
            ? "Are you sure you want to deactivate this listing? It will be hidden from buyers and won't accept new reservations."
            : "Are you sure you want to activate this listing? It will be visible to buyers and accept new reservations."
        }
        confirmText={pendingIsActive === false ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        confirmButtonClass={
          pendingIsActive === false
            ? "bg-red-600 hover:bg-red-700"
            : "bg-green-600 hover:bg-green-700"
        }
        isLoading={toggleActiveMutation.isPending}
      />

      {/* Duplicate Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onConfirm={confirmDuplicate}
        title="Copy This Listing"
        message="Create a copy of this listing as a draft? You can edit all fields in the new listing."
        confirmText="Copy Listing"
        cancelText="Cancel"
        confirmButtonClass="bg-green-600 hover:bg-green-700"
        isLoading={duplicateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Listing"
        message="Are you sure you want to permanently delete this listing? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
