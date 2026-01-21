"use client";

import Link from "next/link";
import Image from "next/image";
import { CATEGORIES } from "@acme/validators";

interface CategoryGridProps {
  categoryCounts: Record<string, number>;
}

export function CategoryGrid({ categoryCounts }: CategoryGridProps) {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-content px-4">
        <h2 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">
          Browse Categories
        </h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {CATEGORIES.map((category, index) => (
            <Link
              key={`${category.id}-${index}`}
              href={`/listings/search?category=${category.id}`}
              className="group relative aspect-[2/1] overflow-hidden rounded-xl"
            >
              {/* Background Image */}
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-black/40 transition-opacity group-hover:bg-black/50" />

              {/* Green left bar */}
              <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#0DAE09]" />

              {/* Content */}
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                <h3 className="text-base uppercase font-semibold text-white md:text-2xl">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
