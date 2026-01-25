"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { ListingCard } from "~/components/listings/listing-card";

export default function MyLikesPage() {
  const router = useRouter();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tListing = useTranslations("listing");
  const [offset, setOffset] = useState(0);
  const limit = 12;

  const { data: session, isLoading: sessionLoading } = api.auth.getSession.useQuery();
  const { data: likesData, isLoading: likesLoading } = api.like.myLikedListings.useQuery(
    { limit, offset },
    { enabled: !!session?.user }
  );

  if (sessionLoading || likesLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">{tCommon("loading")}</p>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/profile/likes"));
    return null;
  }

  const listings = likesData?.listings ?? [];
  const totalCount = likesData?.total ?? 0;
  const hasMore = likesData?.hasMore ?? false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center text-sm text-gray-600 hover:text-gray-900"
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
          {tCommon("back")}
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("myLikes")}
            </h1>
            <p className="mt-1 text-gray-600">
              {t("likesCount", { count: totalCount })}
            </p>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {listings.length === 0 && offset === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow-md">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            {t("noLikesYet")}
          </h2>
          <p className="mt-2 text-gray-600">
            {t("noLikesDescription")}
          </p>
          <Link
            href="/listings/search"
            className="mt-6 inline-block rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
          >
            {tListing("browseListings")}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={{
                  ...listing,
                  seller: {
                    ratingAverage: listing.seller?.ratingAverage ?? null,
                    ratingCount: listing.seller?.ratingCount ?? 0,
                  },
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex items-center justify-center gap-4">
            {offset > 0 && (
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="rounded-md bg-gray-100 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                {tCommon("back")}
              </button>
            )}
            {hasMore && (
              <button
                onClick={() => setOffset(offset + limit)}
                className="rounded-md bg-gray-100 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                {tCommon("loadMore")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
