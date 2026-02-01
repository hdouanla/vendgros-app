"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ListingCard, type ListingData } from "~/components/listings/listing-card";

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

interface FeaturedProductsProps {
  listings: Listing[];
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
          <p className="mt-1 text-gray-600">{t("featuredSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-4">
          {/* Main large card - full width on mobile, left on lg */}
          {mainItem && (
            <ListingCard
              listing={mainItem as ListingData}
              variant="overlay"
              size="large"
            />
          )}

          {/* Side grid - 2 cols on all screens for smaller cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {sideItems.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing as ListingData}
                variant="overlay"
                size="normal"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
