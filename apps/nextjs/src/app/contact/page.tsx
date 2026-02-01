import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, generateCMSMetadata, isCMSSuccess } from "~/lib/cms";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("contact", locale);

  return generateCMSMetadata(result, {
    fallbackTitle: "Contact Us - VendGros",
    fallbackDescription: "Get in touch with VendGros. We're here to help.",
  });
}

export default async function ContactPage() {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("contact", locale);

  if (!isCMSSuccess(result)) {
    return <CMSError />;
  }

  return (
    <CMSPageLayout
      page={result.data}
      relatedLinks={[
        { href: "/help", label: "Help Center" },
        { href: "/about", label: "About Us" },
      ]}
    />
  );
}
