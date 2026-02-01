"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  const footerLinks = {
    company: [
      { label: t("aboutUs"), href: "/about" },
      { label: t("careers"), href: "/careers" },
      { label: t("contactUs"), href: "/contact" },
      { label: t("howItWorks"), href: "/how-it-works" },
    ],
    support: [
      { label: t("helpCenter"), href: "/help" },
      { label: t("safetyGuidelines"), href: "/safety" },
      { label: t("sellingFees"), href: "/fees" },
    ],
    legal: [
      { label: t("termsOfService"), href: "/terms-of-service" },
      { label: t("privacyPolicy"), href: "/privacy-policy" },
      { label: t("cookiePolicy"), href: "/cookies" },
    ],
  };

  return (
    <footer className="bg-[#0B1D14] text-white">
      <div className="mx-auto max-w-content px-4 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-4 inline-block">
              <Image
                src="/vendgros-logo-web-white.png"
                alt="VendGros"
                width={220}
                height={46}
              />
            </Link>
            <p className="mb-6 max-w-sm text-sm text-gray-400">
              {t("tagline")}
            </p>
          </div>

          {/* Company links */}
          <div>
            <h3 className="mb-4 font-semibold text-white">{t("company")}</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-[#0DAE09]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h3 className="mb-4 font-semibold text-white">{t("support")}</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-[#0DAE09]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* QR code - scan or click to follow */}
          <div>
            <h3 className="mb-4 font-semibold text-white">
              {t("scanOrClickToFollow")}
            </h3>
            <a
              href="https://repotz.com/s/RVdwLze3"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg p-y-1.5 transition-opacity hover:opacity-90"
              aria-label={t("scanOrClickToFollow")}
            >
              <Image
                src="/images/qr-code-vend-gros-canada-inc-quebec-platforms.png"
                alt=""
                width={100}
                height={100}
                className="h-auto w-auto"
              />
            </a>
          </div>
        </div>

        {/* Bottom bar: copyright left, terms right */}
        <div className="mt-12 flex flex-col gap-4 border-t border-gray-800 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} {t("copyright")}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-[#0DAE09]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
