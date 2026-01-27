import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { CMSError, CMSPageLayout } from "~/components/cms";
import { cmsClient, isCMSSuccess } from "~/lib/cms";

export const revalidate = 3600; // ISR: regenerate every hour

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const result = await cmsClient.getPageBySlug("careers", locale);

  if (!isCMSSuccess(result)) {
    return {
      title: "Careers - VendGros",
      description: "Join the VendGros team. Explore career opportunities.",
    };
  }

  const { seo } = result.data;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.ogTitle ?? seo.title,
      description: seo.ogDescription ?? seo.description,
      images: seo.ogImage ? [seo.ogImage.url] : undefined,
    },
    twitter: {
      card: (seo.twitterCard ?? "summary") as "summary" | "summary_large_image",
      title: seo.twitterTitle ?? seo.title,
      description: seo.twitterDescription ?? seo.description,
      images: seo.twitterImage ? [seo.twitterImage] : undefined,
    },
    alternates: {
      canonical: seo.canonical,
    },
  };
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
