export const CategoryId = {
  ELECTRONICS: "ELECTRONICS",
  FASHION: "FASHION",
  HOME_GARDEN: "HOME_GARDEN",
  SPORTS_HOBBIES: "SPORTS_HOBBIES",
  HEALTH_BEAUTY: "HEALTH_BEAUTY",
  GROCERIES: "GROCERIES",
  SERVICES: "SERVICES",
  GENERAL: "GENERAL",
} as const;

export type CategoryId = (typeof CategoryId)[keyof typeof CategoryId];

export const CATEGORY_IDS = Object.values(CategoryId);

export interface CategoryDisplay {
  id: CategoryId;
  slug: string;
  image: string;
  gradient: string;
}

export const CATEGORIES: CategoryDisplay[] = [
  {
    id: CategoryId.ELECTRONICS,
    slug: "electronics",
    image: "/images/categories/electronics.jpg",
    gradient: "from-blue-500/80",
  },
  {
    id: CategoryId.FASHION,
    slug: "fashion",
    image: "/images/categories/fashion.jpg",
    gradient: "from-rose-500/80",
  },
  {
    id: CategoryId.HOME_GARDEN,
    slug: "home-garden",
    image: "/images/categories/home-garden.jpg",
    gradient: "from-amber-500/80",
  },
  {
    id: CategoryId.SPORTS_HOBBIES,
    slug: "sports-hobbies",
    image: "/images/categories/sports-hobbies.jpg",
    gradient: "from-orange-500/80",
  },
  {
    id: CategoryId.HEALTH_BEAUTY,
    slug: "health-beauty",
    image: "/images/categories/health-beauty.jpg",
    gradient: "from-pink-500/80",
  },
  {
    id: CategoryId.GROCERIES,
    slug: "groceries",
    image: "/images/categories/groceries.jpg",
    gradient: "from-green-500/80",
  },
  {
    id: CategoryId.SERVICES,
    slug: "services",
    image: "/images/categories/services.jpg",
    gradient: "from-indigo-500/80",
  },
  {
    id: CategoryId.GENERAL,
    slug: "general",
    image: "/images/categories/general.jpg",
    gradient: "from-gray-500/80",
  },
];

export const getCategoryById = (id: CategoryId): CategoryDisplay | undefined =>
  CATEGORIES.find((c) => c.id === id);

export const getCategoryBySlug = (slug: string): CategoryDisplay | undefined =>
  CATEGORIES.find((c) => c.slug === slug);
