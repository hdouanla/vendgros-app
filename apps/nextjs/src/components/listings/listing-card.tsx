"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getStorageUrl } from "~/lib/storage";
import { LikeButton } from "./like-button";
import { FavoriteButton } from "./favorite-button";

export interface ListingData {
  id: string;
  title: string;
  description?: string | null;
  category?: string;
  pricePerPiece: number;
  quantityAvailable: number;
  photos: string[];
  distance?: number;
  publishedAt?: Date | string | null;
  likesCount?: number;
  status?: string;
  seller?: {
    id?: string;
    name?: string | null;
    ratingAverage?: number | null;
    ratingCount?: number;
    sellerRatingAverage?: number | null;
    sellerRatingCount?: number | null;
    verificationBadge?: string | null;
  } | null;
}

interface ListingCardProps {
  listing: ListingData;
  /** Display variant */
  variant?: "default" | "compact" | "overlay";
  /** Size for overlay variant */
  size?: "normal" | "large";
  showEngagement?: boolean;
  /** Initial like state - pass to skip individual API call */
  initialIsLiked?: boolean;
  /** Initial favorite state - pass to skip individual API call */
  initialIsFavorited?: boolean;
  /** @deprecated Use variant="compact" instead */
  compact?: boolean;
}

export function ListingCard({
  listing,
  variant: variantProp,
  size = "normal",
  showEngagement = true,
  initialIsLiked = false,
  initialIsFavorited = false,
  compact,
}: ListingCardProps) {
  const t = useTranslations();

  // Support legacy compact prop
  const variant = variantProp ?? (compact ? "compact" : "default");

  // Normalize rating data from different sources
  const ratingAverage =
    listing.seller?.ratingAverage ??
    listing.seller?.sellerRatingAverage ??
    null;
  const ratingCount =
    listing.seller?.ratingCount ?? listing.seller?.sellerRatingCount ?? 0;

  const imageUrl = listing.photos[0]
    ? getStorageUrl(listing.photos[0])
    : "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600";

  // Overlay variant - content overlaid on image with gradient
  if (variant === "overlay") {
    return (
      <Link
        href={`/listings/${listing.id}`}
        className={`group relative block overflow-hidden rounded-2xl ${
          size === "large"
            ? "aspect-[3/4] lg:aspect-auto lg:h-full"
            : "aspect-square"
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

        {/* Engagement buttons - top right */}
        {showEngagement && (
          <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <LikeButton
              listingId={listing.id}
              initialLikesCount={listing.likesCount ?? 0}
              initialIsLiked={initialIsLiked}
              showCount={false}
              size="sm"
            />
            <FavoriteButton
              listingId={listing.id}
              initialIsFavorited={initialIsFavorited}
              size="sm"
            />
          </div>
        )}

        {/* Content - all at bottom */}
        <div
          className={`absolute inset-x-0 bottom-0 ${size === "large" ? "p-5" : "p-3"}`}
        >
          {/* Title */}
          <h3
            className={`font-bold text-white ${size === "large" ? "mb-2 text-xl" : "mb-1 text-sm"}`}
          >
            {listing.title}
          </h3>

          {/* Description left, Price badge right */}
          <div
            className={`flex items-center justify-between gap-3 ${size === "large" ? "mb-3" : "mb-2"}`}
          >
            <p
              className={`line-clamp-2 text-white/70 ${
                size === "large" ? "text-sm" : "text-xs"
              }`}
            >
              {listing.description ?? t("home.featuredSubtitle")}
            </p>
            <span
              className={`shrink-0 font-semibold text-white ${
                size === "large" ? "text-base" : "text-xs"
              }`}
            >
              ${(listing.pricePerPiece * 1.05).toFixed(2)}
              <span className="ml-1 text-white/80">
                {t("listing.perPiece")}
              </span>
            </span>
          </div>

          {/* Rating + Likes + Availability */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1 text-white/80">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">★</span>
                <span
                  className={`font-medium text-white ${size === "large" ? "text-sm" : "text-xs"}`}
                >
                  {ratingAverage !== null
                    ? Number(ratingAverage).toFixed(1)
                    : "—"}
                </span>
                <span
                  className={`text-white/70 ${size === "large" ? "text-sm" : "text-xs"}`}
                >
                  · {ratingCount} {t("listing.reviews")}
                </span>
                <span
                  className={`flex items-center gap-1 text-white/70 ${size === "large" ? "text-sm" : "text-xs"}`}
                >
                  ·
                  <svg
                    className="h-3.5 w-3.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {listing.likesCount ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-white/70 ${size === "large" ? "text-sm" : "text-xs"}`}
                >
                  {t("home.available", { count: listing.quantityAvailable })}
                </span>
                {listing.publishedAt && (
                  <span
                    className={`text-white/70 ${size === "large" ? "text-sm" : "text-xs"}`}
                  >
                    · {new Date(listing.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button className="rounded-md bg-[#0DAE09] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0B9507]">
              {t("home.shopNow")}
            </button>
          </div>
        </div>
      </Link>
    );
  }

  // Compact variant - simpler grid card
  if (variant === "compact") {
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
          {/* Engagement buttons overlay */}
          {showEngagement && (
            <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <LikeButton
                listingId={listing.id}
                initialLikesCount={listing.likesCount ?? 0}
                initialIsLiked={initialIsLiked}
                showCount={false}
                size="sm"
              />
              <FavoriteButton
                listingId={listing.id}
                initialIsFavorited={initialIsFavorited}
                size="sm"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          {/* Price */}
          <p className="mb-1">
            <span className="text-lg font-bold text-[#0DAE09]">
              ${(listing.pricePerPiece * 1.05).toFixed(2)}
            </span>
            <span className="text-sm text-gray-500">{t("home.perPiece")}</span>
          </p>

          {/* Title */}
          <h3 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-[#0DAE09]">
            {listing.title}
          </h3>

          {/* Rating and Likes */}
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">★</span>
              <span className="font-medium text-gray-700">
                {ratingAverage !== null
                  ? `${Number(ratingAverage).toFixed(1)}/5`
                  : "—"}
              </span>
              <span className="text-gray-500">
                - {ratingCount} {t("listing.reviews")}
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <svg
                className="h-3.5 w-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{listing.likesCount ?? 0}</span>
            </div>
          </div>

          {/* Availability */}
          <p className="text-xs text-gray-500">
            {t("home.available", { count: listing.quantityAvailable })}
          </p>
        </div>
      </Link>
    );
  }

  // Default variant - full card with content below image
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-video bg-gray-200">
        <Image
          src={imageUrl}
          alt={listing.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Engagement buttons overlay */}
        {showEngagement && (
          <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <LikeButton
              listingId={listing.id}
              initialLikesCount={listing.likesCount ?? 0}
              initialIsLiked={initialIsLiked}
              showCount={false}
              size="sm"
            />
            <FavoriteButton
              listingId={listing.id}
              initialIsFavorited={initialIsFavorited}
              size="sm"
            />
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
              {listing.distance.toFixed(1)} km
            </span>
          )}
        </div>

        {listing.description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-600">
            {listing.description}
          </p>
        )}

        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-green-600">
              ${(listing.pricePerPiece * 1.05).toFixed(2)}
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

        {/* Seller Rating and Likes */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <span className="mr-1">⭐</span>
            <span>
              {ratingAverage !== null ? Number(ratingAverage).toFixed(1) : "—"}
            </span>
            <span className="mx-1">·</span>
            <span>
              {ratingCount} {t("listing.reviews")}
            </span>
          </div>
          <div className="flex items-center text-gray-500">
            <svg
              className="mr-1 h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{listing.likesCount ?? 0}</span>
          </div>
        </div>

        {/* Category Badge and Published Date */}
        <div className="mt-3 flex items-center justify-between">
          {listing.category && (
            <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {listing.category}
            </span>
          )}
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
