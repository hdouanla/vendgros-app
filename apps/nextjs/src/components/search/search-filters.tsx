"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, SlidersHorizontal, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";

const radiusOptions = [
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
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
  const t = useTranslations("search");
  const [isLocating, setIsLocating] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);

  const categories = [
    { value: "ALL", label: t("allCategories") },
    { value: "GROCERIES", label: t("groceries") },
    { value: "CLOTHING", label: t("clothing") },
    { value: "ELECTRONICS", label: t("electronics") },
    { value: "HOME_GOODS", label: t("homeGoods") },
    { value: "TOYS", label: t("toys") },
    { value: "SPORTS", label: t("sports") },
    { value: "BOOKS", label: t("books") },
    { value: "OTHER", label: t("other") },
  ];

  const sortOptions = [
    { value: "distance", label: t("sortDistance") },
    { value: "price", label: t("sortPrice") },
    { value: "date", label: t("sortNewest") },
    { value: "rating", label: t("sortRating") },
  ];

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
      setPostalCodeError(t("pleaseEnterPostalCode"));
      return false;
    }
    const normalized = code.replace(/\s/g, "").toUpperCase();
    const postalCodeRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
    if (!postalCodeRegex.test(normalized)) {
      setPostalCodeError(t("invalidPostalCode"));
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
      alert(t("geoNotSupported"));
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
        alert(t("unableToLocate"));
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
      {/* Primary Row: More Filters | Search Input + Button | Use My Location */}
      <div className={`flex flex-col gap-3 lg:flex-row lg:items-center ${postalCodeError ? "pb-4" : ""}`}>
        {/* More Filters Button */}
        <Button
          type="button"
          variant="outline"
          className={`h-12 whitespace-nowrap rounded-lg font-semibold text-lg border-gray-300 px-5 ${
            showMoreFilters || hasActiveFilters
              ? "bg-green-50 border-green-300 text-green-700"
              : "text-gray-700 hover:bg-gray-50"
          }`}
          onClick={() => setShowMoreFilters(!showMoreFilters)}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {t("moreFilters")}
          {hasActiveFilters && !showMoreFilters && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs text-white">
              !
            </span>
          )}
        </Button>

        {/* Search Input with integrated Search Button */}
        <div className="relative flex flex-1 items-center">
          <div className="relative flex flex-1 items-center rounded-lg border border-gray-300 bg-white focus-within:border-[#0DAE09] focus-within:ring-1 focus-within:ring-[#0DAE09]">
            <svg
              className="ml-4 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="text"
              placeholder={t("searchByPostalCode")}
              value={values.postalCode}
              onChange={(e) => {
                setPostalCodeError(null);
                updateValue("postalCode", e.target.value.toUpperCase());
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className={`h-12 flex-1 border-0 bg-transparent pl-3 pr-4 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${postalCodeError ? "text-red-600" : ""}`}
              maxLength={7}
            />
            <Button
              type="button"
              className="h-12 rounded-l-none text-lg font-semibold rounded-r-lg bg-[#0DAE09] px-6 hover:bg-[#0B9507]"
              onClick={handleSearch}
            >
              {t("search")}
            </Button>
          </div>
          {postalCodeError && (
            <p className="absolute -bottom-5 left-0 text-xs text-red-600">
              {postalCodeError}
            </p>
          )}
        </div>

        {/* Use My Location Button */}
        <Button
          type="button"
          variant="outline"
          className="h-12 whitespace-nowrap rounded-lg border-gray-300 font-semibold text-lg px-5 text-[#0DAE09] hover:bg-green-50 hover:border-green-300"
          onClick={handleUseLocation}
          disabled={isLocating}
        >
          <MapPin className="mr-2 h-4 w-4 text-[#0DAE09]" />
          <span className="hidden sm:inline">
            {isLocating ? t("locating") : t("useMyLocation")}
          </span>
          <span className="sm:hidden">
            {isLocating ? "..." : t("location")}
          </span>
        </Button>
      </div>

      {/* Advanced Filters (hidden in compact mode until expanded) */}
      {showAdvancedFilters && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Radius */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("radius")}
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
              {t("sortBy")}
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
              {t("category")}
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
              {t("minPrice")}
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
              {t("maxPrice")}
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
