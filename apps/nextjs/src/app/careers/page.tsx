import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, generateCMSMetadata, isCMSSuccess } from "~/lib/cms";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("careers", locale);

  return generateCMSMetadata(result, {
    fallbackTitle: "Careers - VendGros",
    fallbackDescription: "Join the VendGros team. Explore career opportunities.",
  });
}

export default async function CareersPage() {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("careers", locale);

  if (!isCMSSuccess(result)) {
    return <CMSError />;
  }

  return (
    <CMSPageLayout
      page={result.data}
      relatedLinks={[
        { href: "/about", label: "About Us" },
        { href: "/contact", label: "Contact Us" },
      ]}
    />
  );
}
