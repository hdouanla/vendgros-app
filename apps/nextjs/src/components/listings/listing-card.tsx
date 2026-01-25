"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    description: string;
    category: string;
    pricePerPiece: number;
    quantityAvailable: number;
    photos: string[];
    distance?: number;
    publishedAt?: Date | string | null;
    seller: {
      ratingAverage: number | null;
      ratingCount: number;
    };
  };
}

export function ListingCard({ listing }: ListingCardProps) {
  const t = useTranslations();

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg"
    >
      {/* Image */}
      <div className="aspect-video bg-gray-200">
        {listing.photos[0] ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            {t("listing.photos")}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">
            {listing.title}
          </h3>
          {listing.distance !== undefined && (
            <span className="ml-2 flex-shrink-0 text-sm text-gray-500">
              {t("listing.distanceAway", {
                distance: listing.distance.toFixed(1),
              })}
            </span>
          )}
        </div>

        <p className="mb-3 line-clamp-2 text-sm text-gray-600">
          {listing.description}
        </p>

        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-green-600">
              ${listing.pricePerPiece.toFixed(2)}
            </span>
            <span className="ml-1 text-sm text-gray-500">
              / {t("listing.pricePerPiece")}
            </span>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">
              {listing.quantityAvailable} {t("listing.quantityAvailable")}
            </div>
          </div>
        </div>

        {/* Seller Rating */}
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-1">⭐</span>
          <span>
            {listing.seller.ratingAverage?.toFixed(1) ?? "—"}
          </span>
          <span className="mx-1">·</span>
          <span>
            {listing.seller.ratingCount} {t("listing.reviews")}
          </span>
        </div>

        {/* Category Badge and Published Date */}
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {listing.category}
          </span>
          {listing.publishedAt && (
            <span className="text-xs text-gray-500">
              {new Date(listing.publishedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
