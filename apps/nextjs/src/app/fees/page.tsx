import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, generateCMSMetadata, isCMSSuccess } from "~/lib/cms";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("fees", locale);

  return generateCMSMetadata(result, {
    fallbackTitle: "Selling Fees - VendGros",
    fallbackDescription: "Learn about VendGros selling fees and pricing.",
  });
}

export default async function FeesPage() {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("fees", locale);

  if (!isCMSSuccess(result)) {
    return <CMSError />;
  }

  return (
    <CMSPageLayout
      page={result.data}
      relatedLinks={[
        { href: "/help", label: "Help Center" },
        { href: "/terms-of-service", label: "Terms of Service" },
      ]}
    />
  );
}
