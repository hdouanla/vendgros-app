"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { ListingCard } from "~/components/listings/listing-card";

export default function SellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations();

  const { data: seller, isLoading: sellerLoading } =
    api.listing.getSellerProfile.useQuery({ sellerId: id });

  const { data: listings, isLoading: listingsLoading } =
    api.listing.getBySellerId.useQuery(
      { sellerId: id, limit: 50 },
      { enabled: !!seller }
    );

  if (sellerLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{t("errors.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <svg
          className="mr-1 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        {t("common.back")}
      </button>

      {/* Seller Stats Header - No identifying info */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          {t("seller.sellerListings")}
        </h1>

        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
          {/* Rating */}
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">★</span>
            <span className="font-medium">
              {seller.sellerRatingAverage !== null
                ? Number(seller.sellerRatingAverage).toFixed(1)
                : "0.0"}
            </span>
            <span className="text-gray-500">
              ({seller.sellerRatingCount ?? 0} {t("listing.reviews")})
            </span>
          </div>

          {/* Listing count */}
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span>
              {seller.listingCount} {t("seller.activeListings")}
            </span>
          </div>

          {/* Verification badge if present */}
          {seller.verificationBadge && seller.verificationBadge !== "NONE" && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {t("listing.verified")}
            </span>
          )}
        </div>
      </div>

      {/* Listings Grid */}
      {listingsLoading ? (
        <div className="py-8 text-center">
          <p className="text-gray-600">{t("common.loading")}</p>
        </div>
      ) : listings && listings.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              variant="compact"
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 py-12 text-center">
          <p className="text-gray-600">{t("seller.noListings")}</p>
        </div>
      )}
    </div>
  );
}
