import { getTranslations } from "next-intl/server";

interface SellerInfoPreviewProps {
  seller: {
    name: string;
    email: string;
    phone: string;
    sellerRatingAverage: number;
    sellerRatingCount: number;
    memberSince: Date;
  };
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <span className="inline-flex text-yellow-400">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`}>★</span>
      ))}
      {hasHalfStar && <span>★</span>}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className="text-gray-300">
          ★
        </span>
      ))}
    </span>
  );
}

function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export async function SellerInfoPreview({ seller }: SellerInfoPreviewProps) {
  const t = await getTranslations("listing");

  return (
    <div className="sticky top-8 space-y-4">
      {/* Seller Info Card */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center gap-2">
          <svg
            className="h-5 w-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">
            {t("sellerInfoPreview")}
          </h3>
        </div>

        <p className="mb-4 text-sm text-gray-500">
          {t("sellerInfoPreviewDescription")}
        </p>

        <div className="space-y-4">
          {/* Name */}
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
              <span className="text-lg font-semibold text-green-700">
                {seller.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{seller.name}</p>
              <p className="text-sm text-gray-500">
                {t("sellerSince")}: {seller.memberSince.toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
            <StarRating rating={seller.sellerRatingAverage} />
            <span className="font-medium text-gray-900">
              {seller.sellerRatingAverage.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">
              ({seller.sellerRatingCount} {t("reviews")})
            </span>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700">
              {t("contactInfoShownToBuyers")}
            </h4>

            {/* Email */}
            <div className="flex items-center gap-2 text-sm">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span className="text-gray-600">{seller.email}</span>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2 text-sm">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span className="text-gray-600">
                {formatPhoneForDisplay(seller.phone)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <svg
                  className="h-3 w-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {t("verified")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Seller Benefits */}
      <div className="rounded-lg bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 flex-shrink-0 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-green-800">
              {t("verifiedSellerBenefits")}
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-green-700">
              <li>{t("verifiedBenefit1")}</li>
              <li>{t("verifiedBenefit2")}</li>
              <li>{t("verifiedBenefit3")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
