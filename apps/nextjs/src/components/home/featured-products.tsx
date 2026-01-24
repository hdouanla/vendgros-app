"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@acme/ui/button";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  pricePerPiece: string;
  photos: string[];
  quantityAvailable: number;
  seller: {
    id: string;
    name: string | null;
    verificationBadge: string | null;
    sellerRatingAverage: string | null;
    sellerRatingCount: number | null;
  } | null;
}

interface FeaturedProductsProps {
  listings: Listing[];
}

function formatPrice(price: string | number): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return numPrice.toFixed(2);
}

export function FeaturedProducts({ listings }: FeaturedProductsProps) {
  const t = useTranslations("home");

  if (listings.length === 0) {
    return null;
  }

  // Split listings for bento layout
  // First item is large (left), next 4 are in a 2x2 grid (right)
  const mainItem = listings[0];
  const sideItems = listings.slice(1, 5);

  return (
    <section className="bg-gray-50 py-12 md:py-16">
      <div className="mx-auto max-w-content px-4">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {t("featuredProducts")}
          </h2>
          <p className="mt-1 text-gray-600">
            {t("featuredSubtitle")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-4">
          {/* Main large card - left side (50%) */}
          {mainItem && (
            <FeaturedCard listing={mainItem} size="large" t={t} />
          )}

          {/* Side grid - 2x2 on right (50%) */}
          <div className="grid grid-cols-2 gap-4">
            {sideItems.map((listing) => (
              <FeaturedCard key={listing.id} listing={listing} size="normal" t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

interface FeaturedCardProps {
  listing: Listing;
  size: "large" | "normal";
  t: ReturnType<typeof useTranslations<"home">>;
}

function FeaturedCard({ listing, size, t }: FeaturedCardProps) {
  const tListing = useTranslations("listing");
  const rating = listing.seller?.sellerRatingAverage
    ? parseFloat(listing.seller.sellerRatingAverage)
    : 4.9;
  const ratingCount = listing.seller?.sellerRatingCount ?? 0;

  const imageUrl =
    listing.photos[0] ??
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={`group relative block overflow-hidden rounded-2xl ${
        size === "large" ? "aspect-[3/4] lg:aspect-auto lg:h-full" : "aspect-square"
      }`}
    >
      {/* Background Image */}
      <Image
        src={imageUrl}
        alt={listing.title}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes={size === "large" ? "50vw" : "25vw"}
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Content - all at bottom */}
      <div className={`absolute inset-x-0 bottom-0 ${size === "large" ? "p-5" : "p-3"}`}>
        {/* Title */}
        <h3 className={`font-bold text-white ${size === "large" ? "text-xl mb-2" : "text-sm mb-1"}`}>
          {listing.title}
        </h3>

        {/* Description left, Price badge right */}
        <div className={`mb-3 flex items-center justify-between gap-3 ${size === "large" ? "" : "mb-2"}`}>
          <p
            className={`line-clamp-2 text-white/70 ${
              size === "large" ? "text-sm" : "text-xs"
            }`}
          >
            {listing.description ?? t("featuredSubtitle")}
          </p>
          <span
            className={`shrink-0 font-semibold text-white ${
              size === "large" ? "text-base" : "text-xs"
            }`}
          >
            ${formatPrice(listing.pricePerPiece)}
            <span className="ml-1 text-white/80">{tListing("perPiece")}</span>
          </span>
        </div>

        {/* Rating + Availability left, Button right */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1 text-white/80">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className={`font-medium text-white ${size === "large" ? "text-sm" : "text-xs"}`}>
                {rating.toFixed(1)}
              </span>
              <span className={`text-white/70 ${size === "large" ? "text-sm" : "text-xs"}`}>
                · {ratingCount} {tListing("reviews")}
              </span>
            </div>
            <span className={`text-white/70 ${size === "large" ? "text-sm" : "text-xs"}`}>
              {t("available", { count: listing.quantityAvailable })}
            </span>
          </div>
          <Button
            size="sm"
            className="bg-[#0DAE09] text-white hover:bg-[#0B9507]"
          >
            {t("shopNow")}
          </Button>
        </div>
      </div>
    </Link>
  );
}
