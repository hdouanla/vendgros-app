"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { ImageUpload } from "./image-upload";
import { getStorageUrl } from "~/lib/storage";

interface ListingFormProps {
  mode?: "create" | "edit";
  initialData?: any;
  listingId?: string;
  hasReservations?: boolean;
  onDuplicate?: () => void;
  onViewAsBuyer?: () => void;
}

const CATEGORIES = [
  "ELECTRONICS",
  "FASHION",
  "HOME_GARDEN",
  "SPORTS_HOBBIES",
  "HEALTH_BEAUTY",
  "GROCERIES",
  "SERVICES",
  "GENERAL",
] as const;

type CategoryId = (typeof CATEGORIES)[number];

// Map category IDs to translation keys
const categoryTranslationKeys: Record<CategoryId, string> = {
  ELECTRONICS: "electronics",
  FASHION: "fashion",
  HOME_GARDEN: "homeGarden",
  SPORTS_HOBBIES: "sportsHobbies",
  HEALTH_BEAUTY: "healthBeauty",
  GROCERIES: "groceries",
  SERVICES: "services",
  GENERAL: "general",
};

// Minimum quantity for listings (configurable via env, defaults to 5)
const MIN_LISTING_QUANTITY = parseInt(process.env.NEXT_PUBLIC_MIN_LISTING_QUANTITY || "5", 10);

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
  const tSearch = useTranslations("search");
  const tListing = useTranslations("listing");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");

  // Helper function to get translations with namespace prefix
  const t = (key: string, params?: Record<string, string | number>) => {
    const [namespace, ...rest] = key.split(".");
    const translationKey = rest.join(".");

    switch (namespace) {
      case "listing":
        return tListing(translationKey as any, params);
      case "common":
        return tCommon(translationKey as any, params);
      case "errors":
        return tErrors(translationKey as any, params);
      case "search":
        return tSearch(translationKey as any, params);
      default:
        return key;
    }
  };

  // Helper to translate API error codes
  const translateApiError = (error: any): string => {
    const message = error?.message || "";
    const cause = error?.data?.cause || error?.cause || {};

    switch (message) {
      case "QUANTITY_BELOW_RESERVED":
        return tErrors("quantityBelowReserved", { count: cause.amountReserved || 0 });
      case "MIN_QUANTITY_REQUIRED":
        return tErrors("minQuantityRequired", { min: cause.min || 5 });
      case "MIN_GREATER_THAN_MAX":
        return tErrors("minGreaterThanMax");
      case "MIN_EXCEEDS_TOTAL":
        return tErrors("minExceedsTotal");
      case "MAX_EXCEEDS_TOTAL":
        return tErrors("maxExceedsTotal");
      default:
        return message;
    }
  };

  const [formData, setFormData] = useState({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    category: initialData?.category ?? "",
    pricePerPiece: initialData?.pricePerPiece ?? "",
    quantityTotal: initialData?.quantityTotal ?? MIN_LISTING_QUANTITY.toString(),
    minPerBuyer: initialData?.minPerBuyer ?? "1",
    maxPerBuyer: initialData?.maxPerBuyer ?? "",
    pickupAddress: initialData?.pickupAddress ?? "",
    postalCode: initialData?.postalCode ?? "",
    pickupInstructions: initialData?.pickupInstructions ?? "",
    photos: initialData?.photos ?? [],
    // Product specifications
    weightKg: initialData?.weightKg ?? "",
    lengthCm: initialData?.lengthCm ?? "",
    widthCm: initialData?.widthCm ?? "",
    heightCm: initialData?.heightCm ?? "",
    // Delivery options
    canDeliver: initialData?.canDeliver ?? false,
    deliveryRadiusKm: initialData?.deliveryRadiusKm ?? "",
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
    onError: (error) => {
      console.error("Failed to create listing:", error);
      setErrors({ submit: translateApiError(error) });
    },
  });

  const updateListing = api.listing.update.useMutation({
    onError: (error) => {
      console.error("Failed to update listing:", error);
      setErrors({ submit: translateApiError(error) });
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
    if (isNaN(quantity) || quantity < MIN_LISTING_QUANTITY) {
      newErrors.quantityTotal = t("errors.minValue", { min: MIN_LISTING_QUANTITY });
    }

    // Validate minPerBuyer and maxPerBuyer constraints
    const minPerBuyer = formData.minPerBuyer ? parseInt(formData.minPerBuyer) : null;
    const maxPerBuyer = formData.maxPerBuyer ? parseInt(formData.maxPerBuyer) : null;

    if (minPerBuyer && maxPerBuyer && minPerBuyer >= maxPerBuyer) {
      newErrors.minPerBuyer = "Minimum must be less than maximum";
    }

    if (minPerBuyer && !isNaN(quantity) && minPerBuyer > quantity) {
      newErrors.minPerBuyer = "Cannot exceed total quantity";
    }

    if (maxPerBuyer && !isNaN(quantity) && maxPerBuyer > quantity) {
      newErrors.maxPerBuyer = "Cannot exceed total quantity";
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
      minPerBuyer: parseInt(formData.minPerBuyer) || 1,
      maxPerBuyer: formData.maxPerBuyer
        ? parseInt(formData.maxPerBuyer)
        : undefined,
      pickupAddress: formData.pickupAddress,
      pickupInstructions: formData.pickupInstructions || undefined,
      postalCode: formData.postalCode,
      photos: formData.photos,
      latitude,
      longitude,
      // Product specifications
      weightKg: formData.weightKg ? parseFloat(formData.weightKg) : undefined,
      lengthCm: formData.lengthCm ? parseFloat(formData.lengthCm) : undefined,
      widthCm: formData.widthCm ? parseFloat(formData.widthCm) : undefined,
      heightCm: formData.heightCm ? parseFloat(formData.heightCm) : undefined,
      // Delivery options
      canDeliver: formData.canDeliver,
      deliveryRadiusKm: formData.canDeliver && formData.deliveryRadiusKm
        ? parseFloat(formData.deliveryRadiusKm)
        : undefined,
    };

    if (mode === "create") {
      const newListing = await createListing.mutateAsync(listingData);

      // Submit for review if requested
      if (saveAs === "review" && newListing) {
        await submitForReview.mutateAsync({ listingId: newListing.id });
      }

      // Navigate after all mutations complete
      router.push(`/listings/${newListing.id}`);
    } else if (listingId) {
      await updateListing.mutateAsync({
        listingId,
        data: listingData,
      });

      // Submit for review if requested
      if (saveAs === "review") {
        await submitForReview.mutateAsync({ listingId });
      }

      // Navigate after all mutations complete
      router.push(`/listings/${listingId}`);
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

  // Handle pickup instructions update for listings with reservations
  const handlePickupInstructionsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (listingId) {
      await updateListing.mutateAsync({
        listingId,
        data: {
          pickupInstructions: formData.pickupInstructions || undefined,
        },
      });

      router.push(`/listings/${listingId}`);
    }
  };

  // Show pickup instructions edit form if in edit mode with reservations
  if (mode === "edit" && hasReservations) {
    return (
      <div className="space-y-6">
        {/* Locked Banner */}
        <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900">
                Listing Details Locked
              </h3>
              <p className="mt-1 text-sm text-yellow-800">
                This listing has reservations. You can only edit pickup instructions.
                To change other details, create a copy of this listing.
              </p>
            </div>
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
              >
                📋 Copy Listing
              </button>
            )}
          </div>
        </div>

        {/* Read-only Listing Details */}
        <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="font-semibold text-gray-900">Listing Details (Read-only)</h3>

          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="font-medium text-gray-600">Title:</span>
              <p className="text-gray-900">{initialData?.title}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Category:</span>
              <p className="text-gray-900">
                {initialData?.category && tSearch(categoryTranslationKeys[initialData.category as CategoryId])}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Price:</span>
              <p className="text-gray-900">${initialData?.pricePerPiece} CAD / piece</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Quantity:</span>
              <p className="text-gray-900">{initialData?.quantityTotal} {(initialData?.quantityTotal ?? 0) > 1 ? "pieces" : "piece"}</p>
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-600">Description:</span>
              <p className="text-gray-900 whitespace-pre-wrap">{initialData?.description}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Pickup Address:</span>
              <p className="text-gray-900">{initialData?.pickupAddress}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Postal Code:</span>
              <p className="text-gray-900">{initialData?.postalCode}</p>
            </div>
            {initialData?.photos && initialData.photos.length > 0 && (
              <div className="md:col-span-2">
                <span className="font-medium text-gray-600">Photos:</span>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {initialData.photos.slice(0, 4).map((photo: string, idx: number) => (
                    <img
                      key={idx}
                      src={getStorageUrl(photo)}
                      alt={`Photo ${idx + 1}`}
                      className="h-16 w-16 rounded object-cover"
                    />
                  ))}
                  {initialData.photos.length > 4 && (
                    <span className="flex h-16 w-16 items-center justify-center rounded bg-gray-200 text-sm text-gray-600">
                      +{initialData.photos.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Editable Pickup Instructions */}
        <form onSubmit={handlePickupInstructionsUpdate} className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-6">
          <h3 className="font-semibold text-gray-900">Pickup Instructions (Editable)</h3>

          {/* Pickup Instructions */}
          <div>
            <label htmlFor="pickupInstructions" className="block text-sm font-medium">
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
          <div className="flex gap-3">
            {onViewAsBuyer && (
              <button
                type="button"
                onClick={onViewAsBuyer}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                👁️ View as Buyer
              </button>
            )}
            <button
              type="submit"
              disabled={updateListing.isPending || isGeocoding}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isGeocoding
                ? "Geocoding..."
                : updateListing.isPending
                  ? "Saving..."
                  : "Update Pickup Instructions"}
            </button>
          </div>
        </form>
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
              {tSearch(categoryTranslationKeys[cat])}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category}</p>
        )}
      </div>

      {/* Price and Quantity */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (isNaN(val) || val < MIN_LISTING_QUANTITY) {
                setFormData(prev => ({ ...prev, quantityTotal: MIN_LISTING_QUANTITY.toString() }));
              }
            }}
            min={MIN_LISTING_QUANTITY}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          />
          <p className="mt-1 text-xs text-gray-500">Minimum {MIN_LISTING_QUANTITY} pieces</p>
          {errors.quantityTotal && (
            <p className="mt-1 text-sm text-red-600">{errors.quantityTotal}</p>
          )}
        </div>
      </div>

      {/* Min/Max Per Buyer */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="minPerBuyer" className="block text-sm font-medium">
            {t("listing.minPerBuyer")}
          </label>
          <input
            type="number"
            id="minPerBuyer"
            name="minPerBuyer"
            value={formData.minPerBuyer}
            onChange={handleChange}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (isNaN(val) || val < 1) {
                setFormData(prev => ({ ...prev, minPerBuyer: "1" }));
              }
            }}
            min="1"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
          />
          <p className="mt-1 text-xs text-gray-500">Minimum pieces buyers must reserve</p>
          {errors.minPerBuyer && (
            <p className="mt-1 text-sm text-red-600">{errors.minPerBuyer}</p>
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
            placeholder="Optional"
          />
          <p className="mt-1 text-xs text-gray-500">Maximum pieces per buyer</p>
          {errors.maxPerBuyer && (
            <p className="mt-1 text-sm text-red-600">{errors.maxPerBuyer}</p>
          )}
        </div>
      </div>

      {/* Product Specifications */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">{tListing("productSpecifications")}</h3>

        {/* Weight */}
        <div>
          <label htmlFor="weightKg" className="block text-sm font-medium">
            {tListing("weight")} (kg), {tListing("ifApplicable")}
          </label>
          <input
            type="number"
            id="weightKg"
            name="weightKg"
            value={formData.weightKg}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            placeholder={tListing("weightPlaceholder")}
          />
        </div>

        {/* Dimensions */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {tListing("dimensions")} (cm), {tListing("ifApplicable")}
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input
                type="number"
                id="lengthCm"
                name="lengthCm"
                value={formData.lengthCm}
                onChange={handleChange}
                step="0.1"
                min="0"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                placeholder={tListing("length")}
              />
            </div>
            <div>
              <input
                type="number"
                id="widthCm"
                name="widthCm"
                value={formData.widthCm}
                onChange={handleChange}
                step="0.1"
                min="0"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                placeholder={tListing("width")}
              />
            </div>
            <div>
              <input
                type="number"
                id="heightCm"
                name="heightCm"
                value={formData.heightCm}
                onChange={handleChange}
                step="0.1"
                min="0"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                placeholder={tListing("height")}
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">{tListing("dimensionsHint")}</p>
        </div>
      </div>

      {/* Delivery Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">{tListing("deliveryOptions")}</h3>

        {/* Can Deliver Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="canDeliver"
            name="canDeliver"
            checked={formData.canDeliver}
            onChange={(e) => setFormData((prev) => ({ ...prev, canDeliver: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="canDeliver" className="text-sm font-medium">
            {tListing("canDeliver")}
          </label>
        </div>

        {/* Delivery Radius (only shown when canDeliver is true) */}
        {formData.canDeliver && (
          <div>
            <label htmlFor="deliveryRadiusKm" className="block text-sm font-medium">
              {tListing("deliveryRadius")} (km)
            </label>
            <input
              type="number"
              id="deliveryRadiusKm"
              name="deliveryRadiusKm"
              value={formData.deliveryRadiusKm}
              onChange={handleChange}
              step="1"
              min="1"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              placeholder={tListing("deliveryRadiusPlaceholder")}
            />
            <p className="mt-1 text-xs text-gray-500">{tListing("deliveryRadiusHint")}</p>
          </div>
        )}
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
