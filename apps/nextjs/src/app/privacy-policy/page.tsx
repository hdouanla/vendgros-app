import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, generateCMSMetadata, isCMSSuccess } from "~/lib/cms";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("privacy-policy", locale);

  return generateCMSMetadata(result, {
    fallbackTitle: "Privacy Policy - VendGros",
    fallbackDescription: "Privacy Policy for VendGros marketplace platform.",
  });
}

export default async function PrivacyPolicyPage() {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("privacy-policy", locale);

  if (!isCMSSuccess(result)) {
    return <CMSError />;
  }

  return (
    <CMSPageLayout
      page={result.data}
      relatedLinks={[
        { href: "/terms-of-service", label: "Terms of Service" },
        { href: "/cookies", label: "Cookie Policy" },
      ]}
    />
  );
}
