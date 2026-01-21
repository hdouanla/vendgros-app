export const CategoryId = {
  GROCERIES: "GROCERIES",
  HOME_GOODS: "HOME_GOODS",
  ELECTRONICS: "ELECTRONICS",
  TOYS: "TOYS",
  SPORTS: "SPORTS",
  OTHER: "OTHER",
  CLOTHING: "CLOTHING",
} as const;

export type CategoryId = (typeof CategoryId)[keyof typeof CategoryId];

export const CATEGORY_IDS = Object.values(CategoryId);

export interface CategoryDisplay {
  id: CategoryId;
  name: string;
  slug: string;
  image: string;
  gradient: string;
}

export const CATEGORIES: CategoryDisplay[] = [
  {
    id: CategoryId.GROCERIES,
    name: "Skincare",
    slug: "skincare",
    image:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
    gradient: "from-emerald-500/80",
  },
  {
    id: CategoryId.HOME_GOODS,
    name: "Home & Living",
    slug: "home-goods",
    image:
      "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=400&fit=crop",
    gradient: "from-amber-500/80",
  },
  {
    id: CategoryId.ELECTRONICS,
    name: "Gadgets",
    slug: "electronics",
    image:
      "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=400&h=400&fit=crop",
    gradient: "from-blue-500/80",
  },
  {
    id: CategoryId.GROCERIES,
    name: "Groceries",
    slug: "groceries",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop",
    gradient: "from-green-500/80",
  },
  {
    id: CategoryId.TOYS,
    name: "Baby & Kids",
    slug: "toys",
    image:
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop",
    gradient: "from-pink-500/80",
  },
  {
    id: CategoryId.SPORTS,
    name: "Hobbies",
    slug: "sports",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop",
    gradient: "from-orange-500/80",
  },
  {
    id: CategoryId.OTHER,
    name: "Pet Supplies",
    slug: "other",
    image:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop",
    gradient: "from-purple-500/80",
  },
  {
    id: CategoryId.CLOTHING,
    name: "Fashion",
    slug: "clothing",
    image:
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=400&fit=crop",
    gradient: "from-rose-500/80",
  },
];

export const getCategoryById = (id: CategoryId): CategoryDisplay | undefined =>
  CATEGORIES.find((c) => c.id === id);

export const getCategoryBySlug = (slug: string): CategoryDisplay | undefined =>
  CATEGORIES.find((c) => c.slug === slug);
