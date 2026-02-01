import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, generateCMSMetadata, isCMSSuccess } from "~/lib/cms";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("how-it-works", locale);

  return generateCMSMetadata(result, {
    fallbackTitle: "How It Works - VendGros",
    fallbackDescription: "Learn how VendGros works. Buy and sell bulk goods locally with ease.",
  });
}

export default async function HowItWorksPage() {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("how-it-works", locale);

  if (!isCMSSuccess(result)) {
    return <CMSError />;
  }

  return (
    <CMSPageLayout
      page={result.data}
      relatedLinks={[
        { href: "/about", label: "About Us" },
        { href: "/fees", label: "Selling Fees" },
      ]}
    />
  );
}
