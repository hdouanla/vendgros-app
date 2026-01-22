"use client";

import { MapPin, Tag, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export function TrustBadges() {
  const t = useTranslations("home");

  const badges = [
    {
      icon: MapPin,
      titleKey: "localPickup" as const,
      descKey: "localPickupDesc" as const,
    },
    {
      icon: Tag,
      titleKey: "dailyBulkDeals" as const,
      descKey: "dailyBulkDealsDesc" as const,
    },
    {
      icon: ShieldCheck,
      titleKey: "safeSecure" as const,
      descKey: "safeSecureDesc" as const,
    },
  ];

  return (
    <section className="border-y border-gray-100 bg-white py-8">
      <div className="mx-auto max-w-content px-4">
        <div className="grid gap-8 md:grid-cols-3">
          {badges.map((badge) => (
            <div
              key={badge.titleKey}
              className="flex items-start gap-4 text-center md:text-left"
            >
              <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-50 md:mx-0">
                <badge.icon className="h-6 w-6 text-[#0DAE09]" />
              </div>
              <div className="w-full md:w-auto">
                <h3 className="mb-1 font-semibold text-gray-900">
                  {t(badge.titleKey)}
                </h3>
                <p className="text-sm text-gray-600">{t(badge.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
