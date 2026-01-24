"use client";

import { MapPin, Zap, ShieldCheck } from "lucide-react";
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
      icon: Zap,
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
    <section className="border-y border-gray-100 bg-white py-12">
      <div className="mx-auto max-w-content px-4">
        <div className="mb-10 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900">
            {t("trustBadgesTitle")}
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {badges.map((badge) => (
            <div key={badge.titleKey} className="text-left">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <badge.icon className="h-6 w-6 text-[#0DAE09]" />
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">
                {t(badge.titleKey)}
              </h3>
              <p className="text-sm text-gray-600">{t(badge.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
