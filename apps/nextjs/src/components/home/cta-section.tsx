"use client";

import Link from "next/link";

import { Button } from "@acme/ui/button";

export function CTASection() {
  return (
    <section className="bg-gray-100 py-12 md:py-16">
      <div className="mx-auto max-w-content px-4">
        <div className="rounded-2xl bg-[#0B4D26] px-8 py-10 md:px-12 md:py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <h2 className="mb-2 text-2xl font-bold text-white md:text-3xl">
                Ready to clear your inventory?
              </h2>
              <p className="text-green-100">
                Join thousands of local businesses selling bulk goods on VendGros
                today.
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="/listings/create">
                <Button className="bg-white text-[#0B4D26] hover:bg-gray-100">
                  Start Selling
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
