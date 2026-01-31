import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@acme/db/client";
import { env } from "~/env";
import { getStorageUrl } from "~/lib/storage";
import { ListingDetailClient } from "./listing-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Fetch listing data for metadata
async function getListing(id: string) {
  const listing = await db.query.listing.findFirst({
    where: (listings, { eq }) => eq(listings.id, id),
    columns: {
      id: true,
      title: true,
      description: true,
      category: true,
      pricePerPiece: true,
      quantityTotal: true,
      quantityAvailable: true,
      photos: true,
      postalCode: true,
      status: true,
    },
  });

  return listing;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) {
    return {
      title: "Listing Not Found - VendGros",
      description: "The listing you're looking for could not be found.",
    };
  }

  const baseUrl = env.VERCEL_ENV === "production"
    ? "https://vendgros.com"
    : "http://localhost:3000";

  const listingUrl = `${baseUrl}/listings/${id}`;
  const price = (listing.pricePerPiece * 1.05).toFixed(2);
  const description = listing.description.length > 160
    ? listing.description.substring(0, 157) + "..."
    : listing.description;

  // Get the first photo URL for OG image
  const ogImage = listing.photos && listing.photos.length > 0
    ? getStorageUrl(listing.photos[0]!)
    : `${baseUrl}/og-default.png`;

  return {
    title: `${listing.title} - $${price} CAD | VendGros`,
    description: description,
    openGraph: {
      title: listing.title,
      description: description,
      url: listingUrl,
      siteName: "VendGros",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: listing.title,
        },
      ],
      locale: "en_CA",
    },
    twitter: {
      card: "summary_large_image",
      title: listing.title,
      description: description,
      images: [ogImage],
    },
    alternates: {
      canonical: listingUrl,
    },
    other: {
      "product:price:amount": price,
      "product:price:currency": "CAD",
      "product:availability": listing.quantityAvailable > 0 ? "in stock" : "out of stock",
    },
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <ListingDetailClient id={id} />;
}
