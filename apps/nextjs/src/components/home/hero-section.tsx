"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations("home");

  return (
    <section className="relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/vendgros-sale-02-2026.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-[#FAF1E5]/70" />
      </div>

      <div className="relative mx-auto max-w-content px-4 py-12 md:py-22 lg:py-24">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* Left: Content */}
          <div>
            <p className="mb-2 text-base font-semibold uppercase tracking-wider text-[#0DAE09]">
              {t("heroSubtitle")}
            </p>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-[#0B1D14] md:text-6xl lg:text-8xl">
              {t("heroTitle")}{" "}
              <span className="text-[#0DAE09]"><br />{t("heroTitleHighlight")}</span>
              <br />
              {t("heroTitleEnd")}
            </h1>
            <p className="mb-6 text-lg text-gray-600">
              {t("heroDescription")}
            </p>
            <Link
              href="/listings/search"
              className="inline-flex items-center rounded-md bg-[#0DAE09] px-6 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-[#0B9507]"
            >
              {t("browseListings")}
            </Link>
          </div>

          {/* Right: Map Illustration */}
          <div className="relative hidden lg:block">
            <div className="relative h-[400px] w-full">
              <Image
                src="/map-with-pointers.png"
                alt="VendGros Map"
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
