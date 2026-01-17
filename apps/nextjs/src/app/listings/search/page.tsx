"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { ListingMap } from "~/components/map/listing-map";

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
  const router = useRouter();

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
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [activePostalCode, setActivePostalCode] = useState<string>("");

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

  // Format postal code as user types
  const formatPostalCode = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();

    // Limit to 6 characters
    const limited = cleaned.slice(0, 6);

    // Add space after 3rd character if we have more than 3 characters
    if (limited.length > 3) {
      return `${limited.slice(0, 3)} ${limited.slice(3)}`;
    }

    return limited;
  };

  // Handle postal code input change
  const handlePostalCodeChange = (value: string) => {
    const formatted = formatPostalCode(value);
    setSearchParams((prev) => ({
      ...prev,
      postalCode: formatted,
    }));
  };

  // Handle postal code search
  const handlePostalCodeSearch = () => {
    if (searchParams.postalCode.trim()) {
      setActivePostalCode(searchParams.postalCode);
      setLatitude(null); // Clear location when using postal code
      setLongitude(null);
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
        postalCode: activePostalCode,
        radiusKm: searchParams.radiusKm,
        category: searchParams.category || undefined,
      },
      {
        enabled: activePostalCode.length > 0,
      },
    );

  const listings = activePostalCode ? postalListings : nearbyListings;
  const isLoading = isLoadingNearby || isLoadingPostal;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
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
      <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Postal Code Search */}
          <div className="lg:col-span-2">
            <label htmlFor="postalCode" className="block text-sm font-medium">
              Search by Postal Code
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                id="postalCode"
                value={searchParams.postalCode}
                onChange={(e) => handlePostalCodeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handlePostalCodeSearch();
                  }
                }}
                placeholder="A1A 1A1"
                maxLength={7}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
              />
              <button
                type="button"
                onClick={handlePostalCodeSearch}
                disabled={!searchParams.postalCode.trim()}
                className="whitespace-nowrap rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Search
              </button>
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
              Radius
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
              Sort By
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
              <option value="distance">Distance</option>
              <option value="price">Price</option>
              <option value="date">Newest</option>
              <option value="rating">Rating</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium">
              Category
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
            <p className="text-gray-600">Loading...</p>
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
