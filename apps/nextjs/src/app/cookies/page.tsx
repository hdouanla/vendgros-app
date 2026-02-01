import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, generateCMSMetadata, isCMSSuccess } from "~/lib/cms";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("cookies", locale);

  return generateCMSMetadata(result, {
    fallbackTitle: "Cookie Policy - VendGros",
    fallbackDescription: "VendGros cookie policy and how we use cookies.",
  });
}

export default async function CookiePolicyPage() {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("cookies", locale);

  if (!isCMSSuccess(result)) {
    return <CMSError />;
  }

  return (
    <CMSPageLayout
      page={result.data}
      relatedLinks={[
        { href: "/privacy-policy", label: "Privacy Policy" },
        { href: "/terms-of-service", label: "Terms of Service" },
      ]}
    />
  );
}
