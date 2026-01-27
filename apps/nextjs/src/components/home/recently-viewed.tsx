"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { useLastVisited } from "~/hooks/use-last-visited";
import { ListingCard } from "~/components/listings/listing-card";

export function RecentlyViewed() {
  const t = useTranslations("home");
  const { visitedIds, isLoaded, clearVisited } = useLastVisited();

  // Fetch listings by IDs
  const { data: listings, isLoading } = api.listing.getByIds.useQuery(
    { ids: visitedIds },
    {
      enabled: isLoaded && visitedIds.length > 0,
    }
  );

  // Don't render if no visited listings or still loading
  if (!isLoaded || visitedIds.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="mx-auto max-w-content px-4">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
                {t("recentlyViewed")}
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="mb-3 aspect-square rounded-xl bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
                <div className="mt-2 h-4 w-full rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!listings || listings.length === 0) {
    return null;
  }

  return (
    <section className="py-12 md:py-16 bg-gray-50">
      <div className="mx-auto max-w-content px-4">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
              {t("recentlyViewed")}
            </h2>
          </div>
          <button
            onClick={clearVisited}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            {t("clearHistory")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {listings.slice(0, 4).map((listing) => (
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
