import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, generateCMSMetadata, isCMSSuccess } from "~/lib/cms";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("safety", locale);

  return generateCMSMetadata(result, {
    fallbackTitle: "Safety Guidelines - VendGros",
    fallbackDescription: "Safety guidelines for buying and selling on VendGros.",
  });
}

export default async function SafetyPage() {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("safety", locale);

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
