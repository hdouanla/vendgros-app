import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, isCMSSuccess } from "~/lib/cms";
import { generateCMSMetadata } from "~/lib/cms/metadata";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("about", locale);

  return generateCMSMetadata(result, {
    fallbackTitle: "About Us - VendGros",
    fallbackDescription: "Learn about VendGros, Canada's premier bulk marketplace.",
  });
}

export default async function AboutPage() {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("about", locale);

  if (!isCMSSuccess(result)) {
    return <CMSError />;
  }

  return (
    <CMSPageLayout
      page={result.data}
      relatedLinks={[
        { href: "/careers", label: "Careers" },
        { href: "/press", label: "Press" },
      ]}
    />
  );
}
