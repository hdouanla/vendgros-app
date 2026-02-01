import Link from "next/link";

import type { CMSPage } from "~/lib/cms";

import { StaticSidebar } from "~/components/layout/static-sidebar";
import { CMSContent } from "./cms-content";

interface CMSPageLayoutProps {
  /** The CMS page data to render */
  page: CMSPage;
  /** Related links to show at the bottom */
  relatedLinks?: {
    href: string;
    label: string;
  }[];
}

/**
 * Reusable layout component for CMS pages
 * Matches the existing styling of privacy-policy and terms-of-service pages
 */
export function CMSPageLayout({ page, relatedLinks }: CMSPageLayoutProps) {
  // Format last modified date
  const lastModified = page.lastModified
    ? new Date(page.lastModified).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <div className="rounded-lg bg-white p-8 shadow-md">
              <h1 className="mb-8 text-3xl font-bold text-gray-900">{page.title}</h1>

              <CMSContent content={page.content} />

              {/* Footer links section */}
              <div className="mt-8 flex flex-wrap gap-4 border-t pt-6">
                <Link href="/" className="text-green-600 hover:underline">
                  &larr; Back to Home
                </Link>

                {relatedLinks?.map((link) => (
                  <span key={link.href} className="flex items-center gap-4">
                    <span className="text-gray-300">|</span>
                    <Link href={link.href} className="text-green-600 hover:underline">
                      {link.label}
                    </Link>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <StaticSidebar />
        </div>
      </div>
    </div>
  );
}
