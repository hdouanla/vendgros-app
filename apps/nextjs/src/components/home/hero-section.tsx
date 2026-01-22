"use client";

import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto max-w-content px-4 py-12 md:py-16 lg:py-20">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* Left: Content */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#0DAE09]">
              Canada&apos;s #1 Bulk Marketplace
            </p>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
              Find Local{" "}
              <span className="text-[#0DAE09]">Bulk Deals</span>
              <br />
              Near You
            </h1>
            <p className="mb-6 text-lg text-gray-600">
              Connect with local sellers, save on shipping, and grab massive
              discounts on bulk inventory.
            </p>
            <Link
              href="/listings/search"
              className="inline-flex items-center rounded-lg bg-[#0DAE09] px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[#0B9507]"
            >
              Browse Listings
            </Link>
          </div>

          {/* Right: Map Illustration */}
          <div className="relative hidden lg:block">
            <div className="relative h-[350px] w-full">
              {/* Map background with gradient */}
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <Image
                  src="/map-with-pointers.png"
                  alt="VendGros"
                  fill
                  className="object-contain grayscale-50 hover:grayscale-0"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
