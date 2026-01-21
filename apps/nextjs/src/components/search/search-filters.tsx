"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, SlidersHorizontal, ChevronUp } from "lucide-react";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";

const categories = [
  { value: "ALL", label: "All Categories" },
  { value: "GROCERIES", label: "Groceries" },
  { value: "CLOTHING", label: "Clothing" },
  { value: "ELECTRONICS", label: "Electronics" },
  { value: "HOME_GOODS", label: "Home & Living" },
  { value: "TOYS", label: "Toys & Games" },
  { value: "SPORTS", label: "Sports" },
  { value: "BOOKS", label: "Books" },
  { value: "OTHER", label: "Other" },
];

const radiusOptions = [
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
];

const sortOptions = [
  { value: "distance", label: "Distance" },
  { value: "price", label: "Price" },
  { value: "date", label: "Newest" },
  { value: "rating", label: "Rating" },
];

export interface SearchFiltersValues {
  postalCode: string;
  category: string;
  radius: string;
  sortBy: string;
  minPrice: string;
  maxPrice: string;
}

interface SearchFiltersProps {
  /** Initial values for the form */
  initialValues?: Partial<SearchFiltersValues>;
  /** If true, redirects to search page on submit. If false, calls onChange */
  redirectOnSearch?: boolean;
  /** Called when values change (for controlled mode) */
  onChange?: (values: SearchFiltersValues) => void;
  /** Called when search button is clicked */
  onSearch?: (values: SearchFiltersValues) => void;
  /** Called when "Use My Location" is clicked */
  onUseLocation?: () => void;
  /** Show card wrapper styling */
  showCard?: boolean;
  /** Additional className */
  className?: string;
  /** If true, hides advanced filters behind a toggle (default: false) */
  compact?: boolean;
}

export function SearchFilters({
  initialValues,
  redirectOnSearch = true,
  onChange,
  onSearch,
  onUseLocation,
  showCard = true,
  className = "",
  compact = false,
}: SearchFiltersProps) {
  const router = useRouter();
  const [isLocating, setIsLocating] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);

  const [values, setValues] = useState<SearchFiltersValues>({
    postalCode: initialValues?.postalCode ?? "",
    category: initialValues?.category ?? "ALL",
    radius: initialValues?.radius ?? "50",
    sortBy: initialValues?.sortBy ?? "distance",
    minPrice: initialValues?.minPrice ?? "",
    maxPrice: initialValues?.maxPrice ?? "",
  });

  const updateValue = <K extends keyof SearchFiltersValues>(
    key: K,
    value: SearchFiltersValues[K]
  ) => {
    const newValues = { ...values, [key]: value };
    setValues(newValues);
    onChange?.(newValues);
  };

  const validatePostalCode = (code: string): boolean => {
    if (!code.trim()) {
      setPostalCodeError("Please enter a postal code");
      return false;
    }
    const normalized = code.replace(/\s/g, "").toUpperCase();
    const postalCodeRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
    if (!postalCodeRegex.test(normalized)) {
      setPostalCodeError("Invalid postal code format (e.g., A1A 1A1)");
      return false;
    }
    setPostalCodeError(null);
    return true;
  };

  const handleSearch = () => {
    // Validate postal code if provided
    if (values.postalCode && !validatePostalCode(values.postalCode)) {
      return;
    }

    if (redirectOnSearch) {
      const params = new URLSearchParams();

      if (values.postalCode) {
        params.set("postalCode", values.postalCode.toUpperCase().replace(/\s/g, ""));
      }
      if (values.category && values.category !== "ALL") {
        params.set("category", values.category);
      }
      if (values.radius) {
        params.set("radius", values.radius);
      }
      if (values.sortBy) {
        params.set("sortBy", values.sortBy);
      }
      if (values.minPrice) {
        params.set("minPrice", values.minPrice);
      }
      if (values.maxPrice) {
        params.set("maxPrice", values.maxPrice);
      }

      router.push(`/listings/search?${params.toString()}`);
    } else {
      onSearch?.(values);
    }
  };

  const handleUseLocation = () => {
    if (onUseLocation) {
      onUseLocation();
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const params = new URLSearchParams();
        params.set("lat", position.coords.latitude.toString());
        params.set("lng", position.coords.longitude.toString());
        if (values.category && values.category !== "ALL") {
          params.set("category", values.category);
        }
        if (values.radius) {
          params.set("radius", values.radius);
        }
        if (values.sortBy) {
          params.set("sortBy", values.sortBy);
        }

        setIsLocating(false);
        router.push(`/listings/search?${params.toString()}`);
      },
      () => {
        setIsLocating(false);
        alert("Unable to retrieve your location");
      }
    );
  };

  const inputClassName = "h-11 border-gray-300 bg-white focus:border-[#0DAE09] focus:ring-[#0DAE09]";
  const selectTriggerClassName = "h-11 border-gray-300 bg-white focus:border-[#0DAE09] focus:ring-[#0DAE09]";

  // Check if any advanced filters are active
  const hasActiveFilters =
    values.category !== "ALL" ||
    values.radius !== "50" ||
    values.sortBy !== "distance" ||
    values.minPrice !== "" ||
    values.maxPrice !== "";

  const showAdvancedFilters = !compact || showMoreFilters;

  const content = (
    <>
      {/* Primary Row: Postal Code, Search, Use My Location */}
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-end ${postalCodeError ? "pb-4" : ""}`}>
        {/* Postal Code Input */}
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Search by Postal Code
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="A1A 1A1"
                value={values.postalCode}
                onChange={(e) => {
                  setPostalCodeError(null);
                  updateValue("postalCode", e.target.value.toUpperCase());
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className={`w-full ${inputClassName} ${postalCodeError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                maxLength={7}
              />
              {postalCodeError && (
                <p className="absolute -bottom-5 left-0 text-xs text-red-600">
                  {postalCodeError}
                </p>
              )}
            </div>
            <Button
              type="button"
              className="h-11 bg-[#0DAE09] px-6 hover:bg-[#0B9507]"
              onClick={handleSearch}
            >
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 whitespace-nowrap border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={handleUseLocation}
              disabled={isLocating}
            >
              <MapPin className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">
                {isLocating ? "Locating..." : "Use My Location"}
              </span>
              <span className="sm:hidden">
                {isLocating ? "..." : "Location"}
              </span>
            </Button>
          </div>
        </div>

        {/* More Filters Toggle (only in compact mode) */}
        {compact && (
          <Button
            type="button"
            variant="outline"
            className={`h-11 whitespace-nowrap border-gray-300 ${
              showMoreFilters || hasActiveFilters
                ? "bg-green-50 border-green-300 text-green-700"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => setShowMoreFilters(!showMoreFilters)}
          >
            {showMoreFilters ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Less Filters
              </>
            ) : (
              <>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                More Filters
                {hasActiveFilters && (
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs text-white">
                    !
                  </span>
                )}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Advanced Filters (hidden in compact mode until expanded) */}
      {showAdvancedFilters && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Radius */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Radius
            </label>
            <Select value={values.radius} onValueChange={(v) => updateValue("radius", v)}>
              <SelectTrigger className={selectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Sort By
            </label>
            <Select value={values.sortBy} onValueChange={(v) => updateValue("sortBy", v)}>
              <SelectTrigger className={selectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Category
            </label>
            <Select value={values.category} onValueChange={(v) => updateValue("category", v)}>
              <SelectTrigger className={selectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Min Price */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Min Price (CAD)
            </label>
            <Input
              type="number"
              placeholder="0"
              value={values.minPrice}
              onChange={(e) => updateValue("minPrice", e.target.value)}
              className={inputClassName}
              min={0}
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Max Price (CAD)
            </label>
            <Input
              type="number"
              placeholder="Any"
              value={values.maxPrice}
              onChange={(e) => updateValue("maxPrice", e.target.value)}
              className={inputClassName}
              min={0}
            />
          </div>
        </div>
      )}
    </>
  );

  if (showCard) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-xl md:p-8 ${className}`}>
        {content}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
}
