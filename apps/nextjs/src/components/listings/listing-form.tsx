"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/trpc/react";
import { ImageUpload } from "./image-upload";

interface ListingFormProps {
  mode?: "create" | "edit";
  initialData?: any;
  listingId?: string;
  hasReservations?: boolean;
  onDuplicate?: () => void;
  onViewAsBuyer?: () => void;
}

const CATEGORIES = [
  "GROCERIES",
  "CLOTHING",
  "ELECTRONICS",
  "HOME_GOODS",
  "TOYS",
  "SPORTS",
  "BOOKS",
  "OTHER",
];

// Simple translation stub - replace with actual translations later
const t = (key: string, params?: any) => {
  const translations: Record<string, string> = {
    "errors.minLength": `Minimum length is ${params?.min} characters`,
    "errors.minValue": `Minimum value is ${params?.min}`,
    "errors.required": "This field is required",
    "listing.itemTitle": "Item Title",
    "listing.description": "Description",
    "listing.category": "Category",
    "common.select": "Select...",
    "listing.pricePerPiece": "Price Per Piece",
    "listing.quantity": "Quantity",
    "listing.maxPerBuyer": "Max Per Buyer",
    "listing.pickupAddress": "Pickup Address",
    "listing.pickupInstructions": "Pickup Instructions",
    "common.loading": "Loading...",
    "common.save": "Save as Draft",
    "common.submit": "Submit for Review",
    "listing.submitForReview": "Submit for Review",
  };
  return translations[key] || key;
};

export function ListingForm({
  mode = "create",
  initialData,
  listingId,
  hasReservations = false,
  onDuplicate,
  onViewAsBuyer,
}: ListingFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    category: initialData?.category ?? "",
    pricePerPiece: initialData?.pricePerPiece ?? "",
    quantityTotal: initialData?.quantityTotal ?? "",
    maxPerBuyer: initialData?.maxPerBuyer ?? "",
    pickupAddress: initialData?.pickupAddress ?? "",
    postalCode: initialData?.postalCode ?? "",
    pickupInstructions: initialData?.pickupInstructions ?? "",
    photos: initialData?.photos ?? [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    // In edit mode, initialize with existing coordinates
    mode === "edit" && initialData?.latitude && initialData?.longitude
      ? {
          latitude: initialData.latitude,
          longitude: initialData.longitude,
        }
      : null
  );
  // Track the original postal code to detect changes
  const [originalPostalCode] = useState(initialData?.postalCode ?? "");

  const createListing = api.listing.create.useMutation({
    onSuccess: (data) => {
      router.push(`/listings/${data.id}`);
    },
    onError: (error) => {
      console.error("Failed to create listing:", error);
      setErrors({ submit: error.message });
    },
  });

  const updateListing = api.listing.update.useMutation({
    onSuccess: () => {
      if (listingId) {
        router.push(`/listings/${listingId}`);
      }
    },
    onError: (error) => {
      console.error("Failed to update listing:", error);
      setErrors({ submit: error.message });
    },
  });

  const submitForReview = api.listing.submitForReview.useMutation({
    onError: (error) => {
      console.error("Failed to submit for review:", error);
    },
  });

  const handleSubmit = async (e: React.FormEvent, saveAs: "draft" | "review") => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.title || formData.title.length < 10) {
      newErrors.title = t("errors.minLength", { min: 10 });
    }

    if (!formData.description || formData.description.length < 50) {
      newErrors.description = t("errors.minLength", { min: 50 });
    }

    if (!formData.category) {
      newErrors.category = t("errors.required");
    }

    if (formData.photos.length === 0) {
      newErrors.photos = t("errors.required");
    }

    const price = parseFloat(formData.pricePerPiece);
    if (isNaN(price) || price <= 0) {
      newErrors.pricePerPiece = t("errors.minValue", { min: 0 });
    }

    const quantity = parseInt(formData.quantityTotal);
    if (isNaN(quantity) || quantity <= 0) {
      newErrors.quantityTotal = t("errors.minValue", { min: 1 });
    }

    if (!formData.pickupAddress) {
      newErrors.pickupAddress = t("errors.required");
    }

    if (!formData.postalCode) {
      newErrors.postalCode = "Postal code is required";
    } else if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(formData.postalCode)) {
      newErrors.postalCode = "Invalid Canadian postal code format (e.g., M5H 2N2)";
    }

    if (!coordinates) {
      newErrors.postalCode = "Please verify your postal code to get coordinates";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!coordinates) {
      setErrors({ submit: "Unable to geocode address. Please verify postal code." });
      return;
    }

    const { latitude, longitude } = coordinates;

    const listingData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      pricePerPiece: parseFloat(formData.pricePerPiece),
      quantityTotal: parseInt(formData.quantityTotal),
      maxPerBuyer: formData.maxPerBuyer
        ? parseInt(formData.maxPerBuyer)
        : undefined,
      pickupAddress: formData.pickupAddress,
      pickupInstructions: formData.pickupInstructions || undefined,
      postalCode: formData.postalCode,
      photos: formData.photos,
      latitude,
      longitude,
    };

    if (mode === "create") {
      const newListing = await createListing.mutateAsync(listingData);

      // Submit for review if requested
      if (saveAs === "review" && newListing) {
        await submitForReview.mutateAsync({ listingId: newListing.id });
      }
    } else if (listingId) {
      await updateListing.mutateAsync({
        listingId,
        data: listingData,
      });

      // Submit for review if requested
      if (saveAs === "review") {
        await submitForReview.mutateAsync({ listingId });
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // If postal code changed from original, clear coordinates to require re-verification
    if (name === "postalCode") {
      const normalized = value.replace(/\s/g, "").toUpperCase();
      const originalNormalized = originalPostalCode.replace(/\s/g, "").toUpperCase();
      if (normalized !== originalNormalized) {
        setCoordinates(null);
      } else if (mode === "edit" && initialData?.latitude && initialData?.longitude) {
        // Postal code reverted to original, restore original coordinates
        setCoordinates({
          latitude: initialData.latitude,
          longitude: initialData.longitude,
        });
      }
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePostalCodeLookup = async () => {
    if (!formData.postalCode) {
      setErrors((prev) => ({ ...prev, postalCode: "Please enter a postal code" }));
      return;
    }

    // Format postal code (add space if missing)
    const formatted = formData.postalCode.replace(/\s/g, "").toUpperCase();
    const postalWithSpace = `${formatted.slice(0, 3)} ${formatted.slice(3)}`;

    setIsGeocoding(true);
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.postalCode;
      return newErrors;
    });

    try {
      const response = await fetch(
        `/api/trpc/listing.geocodePostalCode?batch=1&input=${encodeURIComponent(
          JSON.stringify({ 0: { json: { postalCode: postalWithSpace } } })
        )}`
      );

      const data = await response.json();

      if (data[0]?.result?.data?.json) {
        const coords = data[0].result.data.json;
        setCoordinates({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setFormData((prev) => ({ ...prev, postalCode: postalWithSpace }));
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.postalCode;
          return newErrors;
        });
      } else {
        setErrors((prev) => ({
          ...prev,
          postalCode: "Postal code not found. Please verify it's a valid Canadian postal code.",
        }));
        setCoordinates(null);
      }
    } catch (error) {
      console.error("Postal code lookup failed:", error);
      setErrors((prev) => ({
        ...prev,
        postalCode: "Failed to lookup postal code. Please try again.",
      }));
      setCoordinates(null);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Show locked message if in edit mode with reservations
  if (mode === "edit" && hasReservations) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900">
                Editing Locked
              </h3>
              <p className="mt-2 text-sm text-yellow-800">
                This listing has active or completed reservations. To maintain
                commitment to your buyers, you cannot edit the listing details.
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-yellow-900">
                  Your options:
                </p>
                <ul className="ml-4 list-disc space-y-1 text-sm text-yellow-800">
                  <li>
                    Deactivate this listing to prevent new reservations
                  </li>
                  <li>
                    Contact support if you need to make changes to existing
                    reservations
                  </li>
                  <li>
                    Create a copy of this listing with updated details
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {(onDuplicate || onViewAsBuyer) && (
          <div className="flex justify-end gap-3">
            {onViewAsBuyer && (
              <button
                type="button"
                onClick={onViewAsBuyer}
                className="rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                👁️ View as Buyer
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                className="rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
              >
                📋 Copy This Listing
              </button>
            )}
          </div>
        )}

        {/* Show current listing details in read-only mode */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-semibold text-gray-900">Current Listing Details</h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Title:</span>
              <p className="text-gray-900">{initialData?.title}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Category:</span>
              <p className="text-gray-900">{initialData?.category}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Price:</span>
              <p className="text-gray-900">${initialData?.pricePerPiece} CAD</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Quantity:</span>
              <p className="text-gray-900">{initialData?.quantityTotal} units</p>
            </div>
            <div className="col-span-2">
              <span className="font-medium text-gray-700">Pickup Address:</span>
              <p className="text-gray-900">{initialData?.pickupAddress}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          {t("listing.itemTitle")} *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          placeholder="e.g., Fresh Organic Apples - 50 units"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          {t("listing.description")} *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={6}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          placeholder={t("listing.description")}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Photos */}
      <div>
        <ImageUpload
          photos={formData.photos}
          onChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
          maxPhotos={10}
        />
        {errors.photos && (
          <p className="mt-1 text-sm text-red-600">{errors.photos}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium">
          {t("listing.category")} *
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
        >
          <option value="">{t("common.select")}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category}</p>
        )}
      </div>

      {/* Price and Quantity */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <label htmlFor="pricePerPiece" className="block text-sm font-medium">
            {t("listing.pricePerPiece")} ({process.env.NEXT_PUBLIC_CURRENCY || "CAD"}) *
          </label>
          <input
            type="number"
            id="pricePerPiece"
            name="pricePerPiece"
            value={formData.pricePerPiece}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          />
          {errors.pricePerPiece && (
            <p className="mt-1 text-sm text-red-600">{errors.pricePerPiece}</p>
          )}
        </div>

        <div>
          <label htmlFor="quantityTotal" className="block text-sm font-medium">
            {t("listing.quantity")} *
          </label>
          <input
            type="number"
            id="quantityTotal"
            name="quantityTotal"
            value={formData.quantityTotal}
            onChange={handleChange}
            min="1"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          />
          {errors.quantityTotal && (
            <p className="mt-1 text-sm text-red-600">{errors.quantityTotal}</p>
          )}
        </div>

        <div>
          <label htmlFor="maxPerBuyer" className="block text-sm font-medium">
            {t("listing.maxPerBuyer")}
          </label>
          <input
            type="number"
            id="maxPerBuyer"
            name="maxPerBuyer"
            value={formData.maxPerBuyer}
            onChange={handleChange}
            min="1"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          />
        </div>
      </div>

      {/* Pickup Address and Postal Code */}
      <div className="space-y-4">
        <div>
          <label htmlFor="pickupAddress" className="block text-sm font-medium">
            {t("listing.pickupAddress")} *
          </label>
          <input
            type="text"
            id="pickupAddress"
            name="pickupAddress"
            value={formData.pickupAddress}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder="123 Main St, Toronto, ON"
          />
          {errors.pickupAddress && (
            <p className="mt-1 text-sm text-red-600">{errors.pickupAddress}</p>
          )}
        </div>

        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium">
            Postal Code *
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              className="block flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              placeholder="M5H 2N2"
              maxLength={7}
            />
            <button
              type="button"
              onClick={handlePostalCodeLookup}
              disabled={isGeocoding || !formData.postalCode}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isGeocoding ? "Verifying..." : "Verify"}
            </button>
          </div>
          {errors.postalCode && (
            <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
          )}
          {coordinates && (
            <p className="mt-1 text-sm text-green-600">
              ✓ Coordinates verified: {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Enter a valid Canadian postal code (e.g., M5H 2N2) and click Verify to confirm location
          </p>
        </div>
      </div>

      {/* Pickup Instructions */}
      <div>
        <label
          htmlFor="pickupInstructions"
          className="block text-sm font-medium"
        >
          {t("listing.pickupInstructions")}
        </label>
        <textarea
          id="pickupInstructions"
          name="pickupInstructions"
          value={formData.pickupInstructions}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          placeholder="e.g., Ring doorbell, pickup from side door"
        />
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={(e) => handleSubmit(e, "draft")}
          disabled={
            createListing.isPending ||
            updateListing.isPending ||
            submitForReview.isPending ||
            isGeocoding
          }
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          {isGeocoding
            ? "Geocoding..."
            : createListing.isPending ||
                updateListing.isPending ||
                submitForReview.isPending
              ? t("common.loading")
              : t("common.save")}
        </button>

        <button
          type="button"
          onClick={(e) => handleSubmit(e, "review")}
          disabled={
            createListing.isPending ||
            updateListing.isPending ||
            submitForReview.isPending ||
            isGeocoding
          }
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isGeocoding
            ? "Geocoding..."
            : createListing.isPending ||
                updateListing.isPending ||
                submitForReview.isPending
              ? t("common.loading")
              : t("listing.submitForReview")}
        </button>
      </div>
    </form>
  );
}
