import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, generateCMSMetadata, isCMSSuccess } from "~/lib/cms";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("help", locale);

  return generateCMSMetadata(result, {
    fallbackTitle: "Help Center - VendGros",
    fallbackDescription: "Get help with VendGros. FAQs and support resources.",
  });
}

export default async function HelpPage() {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("help", locale);

  if (!isCMSSuccess(result)) {
    return <CMSError />;
  }

  return (
    <CMSPageLayout
      page={result.data}
      relatedLinks={[
        { href: "/safety", label: "Safety Guidelines" },
        { href: "/contact", label: "Contact Us" },
      ]}
    />
  );
}
