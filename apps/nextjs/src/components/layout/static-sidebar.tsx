"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { getStorageUrl } from "~/lib/storage";

const SIDEBAR_IMAGE_SIZE = 72;

/**
 * Desktop-only sidebar showing the latest 5 featured listings
 * and a link to browse all.
 */
export function StaticSidebar() {
  const t = useTranslations("home");
  const { data: listings = [] } = api.listing.getFeatured.useQuery({
    limit: 5,
  });

  return (
    <aside
      className="hidden min-w-[280px] shrink-0 lg:block"
      aria-label={t("featuredProducts")}
    >
      <div className="sticky top-24 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t("featuredProducts")}
        </h3>

        {listings.length > 0 ? (
        <ul className="space-y-3">
          {listings.map((listing) => {
            const imageUrl = listing.photos[0]
              ? getStorageUrl(listing.photos[0])
              : "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=150";

            return (
              <li key={listing.id}>
                <Link
                  href={`/listings/${listing.id}`}
                  className="flex gap-3 rounded-lg border border-gray-200 bg-white p-2 transition-shadow hover:shadow-md"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes={`${SIDEBAR_IMAGE_SIZE}px`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-gray-900">
                      {listing.title}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#0DAE09]">
                      ${(listing.pricePerPiece * 1.05).toFixed(2)}
                      <span className="ml-1 font-normal text-gray-500">
                        {t("perPiece")}
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        ) : (
          <p className="text-sm text-gray-500">
            {t("noFeaturedListings")}
          </p>
        )}

        <Link
          href="/listings/search"
          className="block rounded-lg border border-[#0DAE09] bg-[#0DAE09] px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#0B9507]"
        >
          {t("seeAll")}
        </Link>
      </div>
    </aside>
  );
}
