import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, generateCMSMetadata, isCMSSuccess } from "~/lib/cms";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("terms-of-service", locale);

  return generateCMSMetadata(result, {
    fallbackTitle: "Terms of Service - VendGros",
    fallbackDescription: "Terms of Service for VendGros marketplace platform.",
  });
}

export default async function TermsOfServicePage() {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("terms-of-service", locale);

  if (!isCMSSuccess(result)) {
    return <CMSError />;
  }

  return (
    <CMSPageLayout
      page={result.data}
      relatedLinks={[
        { href: "/privacy-policy", label: "Privacy Policy" },
        { href: "/cookies", label: "Cookie Policy" },
      ]}
    />
  );
}
