"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

interface FavoriteButtonProps {
  listingId: string;
  /** Pass this to skip the individual isFavorited query */
  initialIsFavorited?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "button";
  className?: string;
}

export function FavoriteButton({
  listingId,
  initialIsFavorited,
  size = "md",
  variant = "icon",
  className = "",
}: FavoriteButtonProps) {
  const router = useRouter();
  const t = useTranslations("listing");
  const utils = api.useUtils();

  const { data: session } = api.auth.getSession.useQuery();

  // Only query if initialIsFavorited is not provided (undefined)
  // This prevents rate limiting when many cards are displayed
  const { data: favoriteStatus } = api.favorite.isFavorited.useQuery(
    { listingId },
    {
      enabled: !!session?.user && initialIsFavorited === undefined,
      staleTime: 60000, // Cache for 1 minute
    }
  );

  const toggleFavorite = api.favorite.toggle.useMutation({
    onMutate: async () => {
      // Optimistic update
      await utils.favorite.isFavorited.cancel({ listingId });

      const prevIsFavorited = utils.favorite.isFavorited.getData({ listingId });

      const currentIsFavorited = favoriteStatus?.isFavorited ?? initialIsFavorited ?? false;

      utils.favorite.isFavorited.setData({ listingId }, {
        isFavorited: !currentIsFavorited,
      });

      return { prevIsFavorited, wasFavorited: currentIsFavorited };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.prevIsFavorited) {
        utils.favorite.isFavorited.setData({ listingId }, context.prevIsFavorited);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      utils.favorite.isFavorited.invalidate({ listingId });
      utils.favorite.myFavorites.invalidate();
    },
  });

  // Use initialIsFavorited if provided, otherwise use query result
  const isFavorited = initialIsFavorited !== undefined
    ? (favoriteStatus?.isFavorited ?? initialIsFavorited)
    : (favoriteStatus?.isFavorited ?? false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }

    toggleFavorite.mutate({ listingId });
  };

  const sizeClasses = {
    sm: "h-7 w-7 text-sm",
    md: "h-9 w-9 text-base",
    lg: "h-11 w-11 text-lg",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  if (variant === "button") {
    return (
      <button
        onClick={handleClick}
        disabled={toggleFavorite.isPending}
        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isFavorited
            ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        } disabled:opacity-50 ${className}`}
        aria-label={isFavorited ? t("removeFromFavorites") : t("addToFavorites")}
      >
        <svg
          className={iconSizes[size]}
          fill={isFavorited ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        <span>{isFavorited ? t("saved") : t("save")}</span>
      </button>
    );
  }

  // Icon variant (default)
  return (
    <button
      onClick={handleClick}
      disabled={toggleFavorite.isPending}
      className={`flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white ${
        isFavorited ? "text-yellow-500" : "text-gray-600 hover:text-yellow-500"
      } disabled:opacity-50 shadow-sm ${sizeClasses[size]} ${className}`}
      aria-label={isFavorited ? t("removeFromFavorites") : t("addToFavorites")}
    >
      <svg
        className={iconSizes[size]}
        fill={isFavorited ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    </button>
  );
}
