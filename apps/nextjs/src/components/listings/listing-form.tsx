"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ImageUpload } from "./image-upload";

interface ListingFormProps {
  mode?: "create" | "edit";
  initialData?: any;
  listingId?: string;
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

export function ListingForm({
  mode = "create",
  initialData,
  listingId,
}: ListingFormProps) {
  const t = useTranslations();
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    category: initialData?.category ?? "",
    pricePerPiece: initialData?.pricePerPiece ?? "",
    quantityTotal: initialData?.quantityTotal ?? "",
    maxPerBuyer: initialData?.maxPerBuyer ?? "",
    pickupAddress: initialData?.pickupAddress ?? "",
    pickupInstructions: initialData?.pickupInstructions ?? "",
    photos: initialData?.photos ?? [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      router.push(`/listings/${listingId}`);
    },
    onError: (error) => {
      console.error("Failed to update listing:", error);
      setErrors({ submit: error.message });
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

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
      photos: formData.photos,
      latitude: 0, // TODO: Geocode address
      longitude: 0, // TODO: Geocode address
    };

    if (mode === "create") {
      await createListing.mutateAsync(listingData);
    } else if (listingId) {
      await updateListing.mutateAsync({
        listingId,
        data: listingData,
      });
    }

    // Submit for review if requested
    if (saveAs === "review") {
      // TODO: Call submitForReview mutation
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

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
            {t("listing.pricePerPiece")} (CAD) *
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

      {/* Pickup Address */}
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
          placeholder="123 Main St, Toronto, ON M5V 1A1"
        />
        {errors.pickupAddress && (
          <p className="mt-1 text-sm text-red-600">{errors.pickupAddress}</p>
        )}
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
          disabled={createListing.isPending || updateListing.isPending}
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          {createListing.isPending || updateListing.isPending
            ? t("common.loading")
            : t("common.save")}
        </button>

        <button
          type="button"
          onClick={(e) => handleSubmit(e, "review")}
          disabled={createListing.isPending || updateListing.isPending}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {createListing.isPending || updateListing.isPending
            ? t("common.loading")
            : t("listing.submitForReview")}
        </button>
      </div>
    </form>
  );
}
