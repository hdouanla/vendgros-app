"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  pricePerPiece: number;
  photos: string[];
  quantityAvailable: number;
  publishedAt?: Date | string | null;
  seller: {
    id: string;
    name: string | null;
    verificationBadge: string | null;
    sellerRatingAverage: number | null;
    sellerRatingCount: number | null;
  } | null;
}

interface FreshArrivalsProps {
  listings: Listing[];
}

function formatPrice(price: string | number): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return numPrice.toFixed(2);
}

export function FreshArrivals({ listings }: FreshArrivalsProps) {
  const t = useTranslations("home");

  if (listings.length === 0) {
    return null;
  }

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-content px-4">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {t("freshArrivals")}
          </h2>
          <Link
            href="/listings/search?sortBy=date"
            className="flex items-center gap-1 text-sm font-medium text-[#0DAE09] hover:text-[#0B9507]"
          >
            {t("seeAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {listings.slice(0, 4).map((listing) => (
            <ArrivalCard key={listing.id} listing={listing} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface ArrivalCardProps {
  listing: Listing;
  t: ReturnType<typeof useTranslations<"home">>;
}

function ArrivalCard({ listing, t }: ArrivalCardProps) {
  const rating = listing.seller?.sellerRatingAverage
    ? parseFloat(listing.seller.sellerRatingAverage)
    : null;

  const imageUrl =
    listing.photos[0] ??
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400";

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      {/* Image */}
      <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-gray-100">
        <Image
          src={imageUrl}
          alt={listing.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>

      {/* Content */}
      <div>
        {/* Price */}
        <p className="mb-1">
          <span className="text-lg font-bold text-[#0DAE09]">
            ${formatPrice(listing.pricePerPiece)}
          </span>
          <span className="text-sm text-gray-500">{t("perPiece")}</span>
        </p>

        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-[#0DAE09]">
          {listing.title}
        </h3>

        {/* Rating */}
        {rating && (
          <div className="mb-1 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-gray-700">
              {rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Availability */}
        <p className="text-xs text-gray-500">
          {t("available", { count: listing.quantityAvailable })}
        </p>
      </div>
    </Link>
  );
}
