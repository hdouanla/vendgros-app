import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getSession } from "~/auth/server";
import { db } from "@acme/db/client";
import { ListingForm } from "~/components/listings/listing-form";
import { SellerInfoPreview } from "~/components/listings/seller-info-preview";

// Force dynamic rendering to ensure auth checks always run
export const dynamic = "force-dynamic";

export default async function CreateListingPage() {
  const t = await getTranslations("listing");
  const session = await getSession();

  // Redirect to signin if not authenticated
  if (!session) {
    redirect("/auth/signin?callbackUrl=" + encodeURIComponent("/listings/create"));
  }

  // Redirect to verification if email not verified
  if (!session.user.emailVerified) {
    redirect("/auth/verify-email");
  }

  // Get user's full profile for seller info display
  const currentUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.id, session.user.id),
    columns: {
      name: true,
      email: true,
      phone: true,
      phoneVerified: true,
      sellerRatingAverage: true,
      sellerRatingCount: true,
      createdAt: true,
    },
  });

  // Redirect to phone verification if phone missing or not verified
  if (!currentUser?.phone || !currentUser?.phoneVerified) {
    // If no phone number, redirect to profile edit first
    if (!currentUser?.phone) {
      redirect("/profile/edit?redirect=" + encodeURIComponent("/auth/verify-phone?redirect=/listings/create"));
    }
    redirect("/auth/verify-phone?redirect=" + encodeURIComponent("/listings/create"));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("createListing")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("createListingSubtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Form Column */}
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <ListingForm mode="create" />
          </div>

          <div className="mt-8 rounded-lg bg-blue-50 p-4">
            <h3 className="text-sm font-medium text-blue-900">
              {t("howItWorks")}
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800">
              <li>{t("howItWorksStep1")}</li>
              <li>{t("howItWorksStep2")}</li>
              <li>{t("howItWorksStep3")}</li>
              <li>{t("howItWorksStep4")}</li>
              <li>{t("howItWorksStep5")}</li>
            </ul>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-1">
          <SellerInfoPreview
            seller={{
              name: currentUser.name,
              email: currentUser.email,
              phone: currentUser.phone ?? "",
              sellerRatingAverage: currentUser.sellerRatingAverage ?? 0,
              sellerRatingCount: currentUser.sellerRatingCount ?? 0,
              memberSince: currentUser.createdAt,
            }}
          />
        </div>
      </div>
    </div>
  );
}
