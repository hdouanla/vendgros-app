"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { ListingMap } from "~/components/map/listing-map";
import { SearchFilters, type SearchFiltersValues } from "~/components/search";

export default function SearchListingsPage() {
  const router = useRouter();
  const urlSearchParams = useSearchParams();

  // Parse URL params
  const urlPostalCode = urlSearchParams.get("postalCode") || "";
  const urlLat = urlSearchParams.get("lat");
  const urlLng = urlSearchParams.get("lng");
  const urlRadius = urlSearchParams.get("radius") || "50";
  const urlCategory = urlSearchParams.get("category") || "";
  const urlSortBy = urlSearchParams.get("sortBy") || "distance";
  const urlMinPrice = urlSearchParams.get("minPrice") || "";
  const urlMaxPrice = urlSearchParams.get("maxPrice") || "";

  const [searchParams, setSearchParams] = useState({
    postalCode: urlPostalCode,
    radiusKm: parseInt(urlRadius) || 50,
    category: urlCategory,
    minPrice: urlMinPrice,
    maxPrice: urlMaxPrice,
    sortBy: urlSortBy as "distance" | "price" | "date" | "rating",
  });

  const [latitude, setLatitude] = useState<number | null>(urlLat ? parseFloat(urlLat) : null);
  const [longitude, setLongitude] = useState<number | null>(urlLng ? parseFloat(urlLng) : null);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [activePostalCode, setActivePostalCode] = useState<string>(urlPostalCode);

  // Update state when URL params change
  useEffect(() => {
    setSearchParams({
      postalCode: urlPostalCode,
      radiusKm: parseInt(urlRadius) || 50,
      category: urlCategory,
      minPrice: urlMinPrice,
      maxPrice: urlMaxPrice,
      sortBy: urlSortBy as "distance" | "price" | "date" | "rating",
    });
    setActivePostalCode(urlPostalCode);
    if (urlLat && urlLng) {
      setLatitude(parseFloat(urlLat));
      setLongitude(parseFloat(urlLng));
    }
  }, [urlPostalCode, urlLat, urlLng, urlRadius, urlCategory, urlSortBy, urlMinPrice, urlMaxPrice]);

  // Get user location
  const getUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setActivePostalCode(""); // Clear postal code when using location
        },
        (error) => {
          console.error("Error getting location:", error);
        },
      );
    }
  };

  // Handle search from SearchFilters component
  const handleSearch = (values: SearchFiltersValues) => {
    if (values.postalCode.trim()) {
      setActivePostalCode(values.postalCode.replace(/\s/g, ""));
      setLatitude(null);
      setLongitude(null);
    }
    setSearchParams({
      postalCode: values.postalCode,
      radiusKm: parseInt(values.radius) || 50,
      category: values.category === "ALL" ? "" : values.category,
      minPrice: values.minPrice,
      maxPrice: values.maxPrice,
      sortBy: values.sortBy as "distance" | "price" | "date" | "rating",
    });
  };

  // Handle filter value changes
  const handleFilterChange = (values: SearchFiltersValues) => {
    setSearchParams({
      postalCode: values.postalCode,
      radiusKm: parseInt(values.radius) || 50,
      category: values.category === "ALL" ? "" : values.category,
      minPrice: values.minPrice,
      maxPrice: values.maxPrice,
      sortBy: values.sortBy as "distance" | "price" | "date" | "rating",
    });
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
  const {
    data: postalListings,
    isLoading: isLoadingPostal,
    error: postalError,
  } = api.listing.searchByPostalCode.useQuery(
    {
      postalCode: activePostalCode,
      radiusKm: searchParams.radiusKm,
      category: searchParams.category || undefined,
    },
    {
      enabled: activePostalCode.length > 0,
      retry: false,
    },
  );

  const listings = activePostalCode ? postalListings : nearbyListings;
  const isLoading = isLoadingNearby || isLoadingPostal;
  const postalCodeError = postalError?.message;

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Search Nearby Listings
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Find bulk deals in your area
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8">
        <SearchFilters
          key={`${urlPostalCode}-${urlLat}-${urlLng}-${urlRadius}-${urlCategory}-${urlSortBy}`}
          redirectOnSearch={false}
          onSearch={handleSearch}
          onChange={handleFilterChange}
          onUseLocation={getUserLocation}
          compact={true}
          initialValues={{
            postalCode: searchParams.postalCode,
            radius: searchParams.radiusKm.toString(),
            category: searchParams.category || "ALL",
            sortBy: searchParams.sortBy,
            minPrice: searchParams.minPrice,
            maxPrice: searchParams.maxPrice,
          }}
        />
      </div>

      {/* Results */}
      <div>
        {isLoading ? (
          <div className="py-12 text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : postalCodeError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-8 text-center">
            <div className="mb-2 text-red-600">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-700 font-medium">{postalCodeError}</p>
            <p className="mt-2 text-sm text-red-600">
              Try a different postal code or use "Use My Location" instead.
            </p>
          </div>
        ) : !latitude && !longitude && !activePostalCode ? (
          <div className="rounded-lg bg-blue-50 p-8 text-center">
            <p className="text-gray-700">
              Enter a postal code and click "Search", or use "Use My Location" to see nearby listings
            </p>
          </div>
        ) : listings && listings.length > 0 ? (
          <>
            {/* View Toggle and Results Count */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {listings.length} listings found
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${
                    viewMode === "grid"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <svg
                    className="inline-block mr-1 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${
                    viewMode === "map"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <svg
                    className="inline-block mr-1 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  Map
                </button>
              </div>
            </div>

            {/* Grid View */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {listings.map((item: any) => (
                  <div
                    key={item.listing.id}
                    className="cursor-pointer overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg"
                    onClick={() => router.push(`/listings/${item.listing.id}`)}
                  >
                    {/* Image */}
                    <div className="aspect-video bg-gray-200">
                      {item.listing.photos && item.listing.photos.length > 0 ? (
                        <img
                          src={item.listing.photos[0]}
                          alt={item.listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                          No photo
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.listing.title}
                        </h3>
                        {item.distance && (
                          <span className="ml-2 flex-shrink-0 text-sm text-gray-500">
                            {item.distance.toFixed(1)} km
                          </span>
                        )}
                      </div>

                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {item.listing.category}
                        </span>
                        <span className="inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          {item.listing.status}
                        </span>
                      </div>

                      <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                        {item.listing.description}
                      </p>

                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-2xl font-bold text-green-600">
                            ${item.listing.pricePerPiece.toFixed(2)}
                          </span>
                          <span className="ml-1 text-sm text-gray-600">
                            / piece
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.listing.quantityAvailable} available
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Map View */}
            {viewMode === "map" && (
              <ListingMap
                listings={listings.map((item: any) => ({
                  id: item.listing.id,
                  latitude: item.listing.latitude,
                  longitude: item.listing.longitude,
                  title: item.listing.title,
                  pricePerPiece: item.listing.pricePerPiece,
                  quantityAvailable: item.listing.quantityAvailable,
                  category: item.listing.category,
                  distance: item.distance,
                }))}
                center={
                  latitude && longitude ? [longitude, latitude] : undefined
                }
                zoom={
                  searchParams.radiusKm <= 10
                    ? 12
                    : searchParams.radiusKm <= 25
                      ? 11
                      : 10
                }
                onMarkerClick={(listingId) => {
                  router.push(`/listings/${listingId}`);
                }}
                height="600px"
                className="w-full"
              />
            )}
          </>
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center">
            <p className="text-gray-700">No listings found</p>
          </div>
        )}
      </div>
    </div>
  );
}
