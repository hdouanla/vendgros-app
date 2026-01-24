"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@acme/ui/button";

export function CTASection() {
  const t = useTranslations("home");

  return (
    <section className="bg-[#FFE9A1] py-12 md:py-16">
      <div className="mx-auto max-w-content px-4">
        <div className="rounded-2xl bg-[#0B4D26] px-8 py-10 md:px-12 md:py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <h2 className="mb-2 text-2xl font-bold text-white md:text-3xl">
                {t("ctaTitle")}
              </h2>
              <p className="text-green-100">
                {t("ctaDescription")}
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/listings/create">
                <Button className="h-12 px-8 text-base font-semibold bg-white text-[#0B4D26] hover:bg-gray-100">
                  {t("startSelling")}
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button
                  className="h-12 px-8 text-base font-semibold bg-transparent border-2 border-white text-white hover:bg-white/20"
                >
                  {t("learnMore")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
