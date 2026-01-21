"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

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
}

export function SearchFilters({
  initialValues,
  redirectOnSearch = true,
  onChange,
  onSearch,
  onUseLocation,
  showCard = true,
  className = "",
}: SearchFiltersProps) {
  const router = useRouter();
  const [isLocating, setIsLocating] = useState(false);

  const [values, setValues] = useState<SearchFiltersValues>({
    postalCode: initialValues?.postalCode ?? "",
    category: initialValues?.category ?? "ALL",
    radius: initialValues?.radius ?? "10",
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

  const handleSearch = () => {
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

  const content = (
    <>
      {/* Row 1: Search, Location, Radius, Sort */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto]">
        {/* Postal Code Input */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Search by Postal Code
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="A1A 1A1"
              value={values.postalCode}
              onChange={(e) => updateValue("postalCode", e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className={`flex-1 ${inputClassName}`}
              maxLength={7}
            />
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
              {isLocating ? "Locating..." : "Use My Location"}
            </Button>
          </div>
        </div>

        {/* Radius */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Radius
          </label>
          <Select value={values.radius} onValueChange={(v) => updateValue("radius", v)}>
            <SelectTrigger className={`w-[120px] ${selectTriggerClassName}`}>
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
            <SelectTrigger className={`w-[140px] ${selectTriggerClassName}`}>
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
      </div>

      {/* Row 2: Category, Min Price, Max Price */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
