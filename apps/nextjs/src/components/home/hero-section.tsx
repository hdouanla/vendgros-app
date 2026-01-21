"use client";

import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto max-w-content px-4 py-12 md:py-16 lg:py-20">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* Left: Content */}
          <div className="max-w-xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#0DAE09]">
              Canada&apos;s #1 Bulk Marketplace
            </p>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
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
              <div className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-green-100/50 to-green-50/30">
                {/* SVG Map illustration */}
                <svg
                  viewBox="0 0 500 400"
                  className="h-full w-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Map paths representing land masses */}
                  <path
                    d="M50 200 Q100 150 150 180 Q200 210 250 170 Q300 130 350 160 Q400 190 450 150"
                    stroke="#0DAE0920"
                    strokeWidth="80"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M80 280 Q130 250 180 270 Q230 290 280 260 Q330 230 380 250 Q430 270 480 240"
                    stroke="#0DAE0915"
                    strokeWidth="60"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M30 120 Q80 100 130 130 Q180 160 230 120 Q280 80 330 110 Q380 140 430 100"
                    stroke="#0DAE0910"
                    strokeWidth="40"
                    fill="none"
                    strokeLinecap="round"
                  />

                  {/* Location pins */}
                  <g>
                    {/* Pin 1 - large */}
                    <path
                      d="M150 150 C150 130 170 120 185 140 C200 160 185 190 175 200 C170 205 165 205 160 200 C150 190 150 170 150 150Z"
                      fill="#0DAE09"
                    />
                    <circle cx="167" cy="150" r="8" fill="white" />
                  </g>

                  <g>
                    {/* Pin 2 - medium */}
                    <path
                      d="M320 100 C320 85 335 78 345 92 C355 106 345 125 338 132 C335 135 331 135 328 132 C320 125 320 115 320 100Z"
                      fill="#0DAE09"
                    />
                    <circle cx="332" cy="100" r="6" fill="white" />
                  </g>

                  <g>
                    {/* Pin 3 - small */}
                    <path
                      d="M400 200 C400 188 412 182 420 192 C428 202 420 217 415 222 C412 224 410 224 407 222 C400 217 400 208 400 200Z"
                      fill="#0DAE09"
                    />
                    <circle cx="410" cy="198" r="5" fill="white" />
                  </g>

                  {/* Dotted connection lines */}
                  <path
                    d="M175 170 Q250 130 332 110"
                    stroke="#0DAE09"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    fill="none"
                    opacity="0.5"
                  />
                  <path
                    d="M345 115 Q380 150 410 198"
                    stroke="#0DAE09"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    fill="none"
                    opacity="0.5"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
