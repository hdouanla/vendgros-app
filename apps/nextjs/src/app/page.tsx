"use client";

import { api } from "~/trpc/react";
import {
  HeroSection,
  SearchBox,
  CategoryGrid,
  TrustBadges,
  FeaturedProducts,
  FreshArrivals,
  RecentlyViewed,
  CTASection,
} from "~/components/home";

export default function HomePage() {
  // Fetch data for homepage sections
  const { data: featuredListings = [] } = api.listing.getFeatured.useQuery({ limit: 8 });
  const { data: latestListings = [] } = api.listing.getLatest.useQuery({ limit: 8 });
  const { data: categoryCounts = {} } = api.listing.getCategoryCounts.useQuery();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <HeroSection />

      {/* Search Box - overlaps hero */}
      <SearchBox />

      {/* Browse Categories */}
      <CategoryGrid categoryCounts={categoryCounts} />

      {/* Trust Badges */}
      <TrustBadges />

      {/* Recently Viewed (client-side rendered based on cookie) */}
      <RecentlyViewed />

      {/* Featured Products */}
      <FeaturedProducts listings={featuredListings} />

      {/* Fresh Arrivals */}
      <FreshArrivals listings={latestListings} />

      {/* CTA Section */}
      <CTASection />
    </div>
  );
}
