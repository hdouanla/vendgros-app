"use client";

import Link from "next/link";
import Image from "next/image";

interface CategoryGridProps {
  categoryCounts: Record<string, number>;
}

const categories = [
  {
    id: "GROCERIES",
    name: "Groceries",
    slug: "groceries",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop",
    gradient: "from-green-500/80",
  },
  {
    id: "HOME_GOODS",
    name: "Home & Living",
    slug: "home-goods",
    image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=400&fit=crop",
    gradient: "from-amber-500/80",
  },
  {
    id: "ELECTRONICS",
    name: "Gadgets",
    slug: "electronics",
    image: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=400&h=400&fit=crop",
    gradient: "from-blue-500/80",
  },
  {
    id: "GROCERIES",
    name: "Groceries",
    slug: "groceries",
    image: "https://images.unsplash.com/photo-1553546895-531931aa1aa8?w=400&h=400&fit=crop",
    gradient: "from-emerald-500/80",
  },
  {
    id: "TOYS",
    name: "Baby & Kids",
    slug: "toys",
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop",
    gradient: "from-pink-500/80",
  },
  {
    id: "SPORTS",
    name: "Hobbies",
    slug: "sports",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop",
    gradient: "from-orange-500/80",
  },
  {
    id: "OTHER",
    name: "Pet Supplies",
    slug: "other",
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop",
    gradient: "from-purple-500/80",
  },
  {
    id: "CLOTHING",
    name: "Fashion",
    slug: "clothing",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=400&fit=crop",
    gradient: "from-rose-500/80",
  },
];

// Deduplicate categories for proper display
const uniqueCategories = [
  {
    id: "GROCERIES",
    name: "Skincare",
    slug: "groceries",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
    gradient: "from-emerald-500/80",
  },
  {
    id: "HOME_GOODS",
    name: "Home & Living",
    slug: "home-goods",
    image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=400&fit=crop",
    gradient: "from-amber-500/80",
  },
  {
    id: "ELECTRONICS",
    name: "Gadgets",
    slug: "electronics",
    image: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=400&h=400&fit=crop",
    gradient: "from-blue-500/80",
  },
  {
    id: "GROCERIES",
    name: "Groceries",
    slug: "groceries-food",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop",
    gradient: "from-green-500/80",
  },
  {
    id: "TOYS",
    name: "Baby & Kids",
    slug: "toys",
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop",
    gradient: "from-pink-500/80",
  },
  {
    id: "SPORTS",
    name: "Hobbies",
    slug: "sports",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop",
    gradient: "from-orange-500/80",
  },
  {
    id: "OTHER",
    name: "Pet Supplies",
    slug: "other",
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop",
    gradient: "from-purple-500/80",
  },
  {
    id: "CLOTHING",
    name: "Fashion",
    slug: "clothing",
    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=400&fit=crop",
    gradient: "from-rose-500/80",
  },
];

export function CategoryGrid({ categoryCounts }: CategoryGridProps) {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-content px-4">
        <h2 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">
          Browse Categories
        </h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {uniqueCategories.map((category, index) => (
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
                <h3 className="text-base font-semibold text-white md:text-lg">
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
