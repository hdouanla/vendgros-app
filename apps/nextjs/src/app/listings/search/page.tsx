"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { ListingCard } from "~/components/listings/listing-card";

const CATEGORIES = [
  "ALL",
  "GROCERIES",
  "CLOTHING",
  "ELECTRONICS",
  "HOME_GOODS",
  "TOYS",
  "SPORTS",
  "BOOKS",
  "OTHER",
];

export default function SearchListingsPage() {
  const t = useTranslations();

  const [searchParams, setSearchParams] = useState({
    postalCode: "",
    radiusKm: 10,
    category: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "distance" as "distance" | "price" | "date" | "rating",
  });

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Get user location
  const getUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
        },
      );
    }
  };

  // Search by coordinates
  const { data: nearbyListings, isLoading: isLoadingNearby } =
    api.listing.searchNearby.useQuery(
      {
        latitude: latitude!,
        longitude: longitude!,
        radiusKm: searchParams.radiusKm,
        category: searchParams.category || undefined,
        minPrice: searchParams.minPrice
          ? parseFloat(searchParams.minPrice)
          : undefined,
        maxPrice: searchParams.maxPrice
          ? parseFloat(searchParams.maxPrice)
          : undefined,
        sortBy: searchParams.sortBy,
      },
      {
        enabled: latitude !== null && longitude !== null,
      },
    );

  // Search by postal code
  const { data: postalListings, isLoading: isLoadingPostal } =
    api.listing.searchByPostalCode.useQuery(
      {
        postalCode: searchParams.postalCode,
        radiusKm: searchParams.radiusKm,
        category: searchParams.category || undefined,
      },
      {
        enabled: searchParams.postalCode.length > 0,
      },
    );

  const listings = searchParams.postalCode
    ? postalListings
    : nearbyListings;
  const isLoading = isLoadingNearby || isLoadingPostal;

  const handlePostalCodeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Postal code search will automatically trigger via the query
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("listing.searchNearby")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Find bulk deals in your area
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Postal Code Search */}
          <div className="lg:col-span-2">
            <label htmlFor="postalCode" className="block text-sm font-medium">
              {t("listing.searchByPostalCode")}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                id="postalCode"
                value={searchParams.postalCode}
                onChange={(e) =>
                  setSearchParams((prev) => ({
                    ...prev,
                    postalCode: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="A1A 1A1"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              />
              <button
                type="button"
                onClick={getUserLocation}
                className="whitespace-nowrap rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Use My Location
              </button>
            </div>
          </div>

          {/* Radius */}
          <div>
            <label htmlFor="radius" className="block text-sm font-medium">
              {t("listing.radius")}
            </label>
            <select
              id="radius"
              value={searchParams.radiusKm}
              onChange={(e) =>
                setSearchParams((prev) => ({
                  ...prev,
                  radiusKm: parseInt(e.target.value),
                }))
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium">
              {t("common.sort")}
            </label>
            <select
              id="sortBy"
              value={searchParams.sortBy}
              onChange={(e) =>
                setSearchParams((prev) => ({
                  ...prev,
                  sortBy: e.target.value as any,
                }))
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            >
              <option value="distance">{t("listing.distance")}</option>
              <option value="price">Price</option>
              <option value="date">Newest</option>
              <option value="rating">{t("listing.rating")}</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium">
              {t("listing.category")}
            </label>
            <select
              id="category"
              value={searchParams.category}
              onChange={(e) =>
                setSearchParams((prev) => ({
                  ...prev,
                  category: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat === "ALL" ? "" : cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div>
            <label htmlFor="minPrice" className="block text-sm font-medium">
              Min Price (CAD)
            </label>
            <input
              type="number"
              id="minPrice"
              value={searchParams.minPrice}
              onChange={(e) =>
                setSearchParams((prev) => ({
                  ...prev,
                  minPrice: e.target.value,
                }))
              }
              step="0.01"
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            />
          </div>

          <div>
            <label htmlFor="maxPrice" className="block text-sm font-medium">
              Max Price (CAD)
            </label>
            <input
              type="number"
              id="maxPrice"
              value={searchParams.maxPrice}
              onChange={(e) =>
                setSearchParams((prev) => ({
                  ...prev,
                  maxPrice: e.target.value,
                }))
              }
              step="0.01"
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">{t("common.loading")}</p>
          </div>
        ) : !latitude && !longitude && !searchParams.postalCode ? (
          <div className="rounded-lg bg-blue-50 p-8 text-center">
            <p className="text-gray-700">
              Enter a postal code or allow location access to see nearby
              listings
            </p>
          </div>
        ) : listings && listings.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {listings.length} {t("listing.listings")} found
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((item: any) => (
                <ListingCard key={item.listing.id} listing={item.listing} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-gray-700">{t("listing.noListings")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
