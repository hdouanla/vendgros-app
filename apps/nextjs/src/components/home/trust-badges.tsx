"use client";

import { MapPin, Tag, ShieldCheck } from "lucide-react";

const badges = [
  {
    icon: MapPin,
    title: "Local Pickup",
    description:
      "Meet sellers in your area—no shipping fees, no hidden costs.",
  },
  {
    icon: Tag,
    title: "Daily Bulk Deals",
    description:
      "Grab massive discounts every day across your favorite categories.",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Secure",
    description:
      "Your deposit is protected until your order is successfully delivered.",
  },
];

export function TrustBadges() {
  return (
    <section className="border-y border-gray-100 bg-white py-8">
      <div className="mx-auto max-w-content px-4">
        <div className="grid gap-8 md:grid-cols-3">
          {badges.map((badge) => (
            <div
              key={badge.title}
              className="flex items-start gap-4 text-center md:text-left"
            >
              <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-50 md:mx-0">
                <badge.icon className="h-6 w-6 text-[#0DAE09]" />
              </div>
              <div className="w-full md:w-auto">
                <h3 className="mb-1 font-semibold text-gray-900">
                  {badge.title}
                </h3>
                <p className="text-sm text-gray-600">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
