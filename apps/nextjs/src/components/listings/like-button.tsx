"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

interface LikeButtonProps {
  listingId: string;
  initialLikesCount?: number;
  /** Pass this to skip the individual isLiked query */
  initialIsLiked?: boolean;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "button";
  className?: string;
}

export function LikeButton({
  listingId,
  initialLikesCount = 0,
  initialIsLiked,
  showCount = true,
  size = "md",
  variant = "icon",
  className = "",
}: LikeButtonProps) {
  const router = useRouter();
  const t = useTranslations("listing");
  const utils = api.useUtils();

  const { data: session } = api.auth.getSession.useQuery();

  // Only query if initialIsLiked is not provided (undefined)
  // This prevents rate limiting when many cards are displayed
  const { data: likeStatus } = api.like.isLiked.useQuery(
    { listingId },
    {
      enabled: !!session?.user && initialIsLiked === undefined,
      staleTime: 60000, // Cache for 1 minute
    }
  );

  const toggleLike = api.like.toggle.useMutation({
    onMutate: async () => {
      // Optimistic update
      await utils.like.isLiked.cancel({ listingId });

      const prevIsLiked = utils.like.isLiked.getData({ listingId });

      const currentIsLiked = likeStatus?.isLiked ?? initialIsLiked ?? false;

      utils.like.isLiked.setData({ listingId }, {
        isLiked: !currentIsLiked,
      });

      return { prevIsLiked, wasLiked: currentIsLiked };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.prevIsLiked) {
        utils.like.isLiked.setData({ listingId }, context.prevIsLiked);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      utils.like.isLiked.invalidate({ listingId });
      utils.like.myLikedListings.invalidate();
    },
  });

  // Use initialIsLiked if provided, otherwise use query result
  const isLiked = initialIsLiked !== undefined
    ? (likeStatus?.isLiked ?? initialIsLiked)
    : (likeStatus?.isLiked ?? false);
  const likesCount = initialLikesCount;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/listings/${listingId}`)}`);
      return;
    }

    toggleLike.mutate({ listingId });
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
        disabled={toggleLike.isPending}
        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          isLiked
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        } disabled:opacity-50 ${className}`}
        aria-label={isLiked ? t("unlike") : t("like")}
      >
        <svg
          className={iconSizes[size]}
          fill={isLiked ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {showCount && <span>{likesCount}</span>}
        <span>{isLiked ? t("liked") : t("like")}</span>
      </button>
    );
  }

  // Icon variant (default)
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={handleClick}
        disabled={toggleLike.isPending}
        className={`flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all hover:scale-110 hover:bg-white ${
          isLiked ? "text-red-500" : "text-gray-600 hover:text-red-500"
        } disabled:opacity-50 shadow-sm ${sizeClasses[size]}`}
        aria-label={isLiked ? t("unlike") : t("like")}
      >
        <svg
          className={iconSizes[size]}
          fill={isLiked ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
      {showCount && likesCount > 0 && (
        <span className="text-sm font-medium text-gray-700">{likesCount}</span>
      )}
    </div>
  );
}
