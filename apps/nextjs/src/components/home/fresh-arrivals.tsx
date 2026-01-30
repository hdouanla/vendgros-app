"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ListingCard } from "~/components/listings/listing-card";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  pricePerPiece: number;
  photos: string[];
  quantityAvailable: number;
  publishedAt?: Date | string | null;
  likesCount?: number;
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
  /** Number of listings to display (default: 8) */
  count?: number;
  /** Custom title (uses translation key "freshArrivals" by default) */
  title?: string;
  /** Show the "See All" link (default: true) */
  showSeeAll?: boolean;
  /** Custom "See All" link href */
  seeAllHref?: string;
  /** Remove section padding for embedded use */
  compact?: boolean;
}

export function FreshArrivals({
  listings,
  count = 8,
  title,
  showSeeAll = true,
  seeAllHref = "/listings/search?sortBy=date",
  compact = false,
}: FreshArrivalsProps) {
  const t = useTranslations("home");

  if (listings.length === 0) {
    return null;
  }

  const displayedListings = listings.slice(0, count);

  return (
    <section className={compact ? "" : "py-12 md:py-16"}>
      <div className={compact ? "" : "mx-auto max-w-content px-4"}>
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {title ?? t("freshArrivals")}
          </h2>
          {showSeeAll && (
            <Link
              href={seeAllHref}
              className="flex items-center gap-1 text-sm font-medium text-[#0DAE09] hover:text-[#0B9507]"
            >
              {t("seeAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {displayedListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              variant="compact"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
