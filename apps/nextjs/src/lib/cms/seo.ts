/**
 * CMS SEO Configuration
 *
 * App-side SEO metadata for all CMS pages. This replaces WordPress SEO
 * plugins (Yoast, Rank Math, etc.) with version-controlled configuration.
 *
 * What's managed here:
 * - description: Meta description for search results
 * - keywords: SEO keywords array
 * - ogImage: Open Graph image URL (optional)
 *
 * What comes from WordPress:
 * - title: Page title (appended with " - VendGros")
 *
 * To update SEO for a page:
 * 1. Find the page slug in seoConfig
 * 2. Update description/keywords for each locale (en, fr, es)
 *
 * @see client.ts - Combines WP title with this SEO config
 * @see metadata.ts - Generates Next.js Metadata from SEO config
 */

import type { CMSLocale, CMSSlug } from "./constants";

/**
 * SEO metadata for a single page (description & keywords only)
 * Title comes from WordPress page title
 */
export interface PageSeoConfig {
  description: string;
  keywords?: string[];
  ogImage?: string; // URL or path to OG image
}

/**
 * SEO configuration for all pages and locales
 */
export const seoConfig: Record<CMSSlug, Record<CMSLocale, PageSeoConfig>> = {
  about: {
    en: {
      description:
        "Learn about VendGros, the leading Canadian marketplace for buying and selling bulk goods locally. Our mission is to reduce waste and save money.",
      keywords: [
        "bulk marketplace Canada",
        "wholesale marketplace",
        "buy bulk Canada",
        "local bulk deals",
      ],
    },
    fr: {
      description:
        "Découvrez VendGros, le marché canadien de référence pour acheter et vendre des articles en gros localement.",
      keywords: [
        "marché de gros Canada",
        "achat en gros",
        "vente en gros",
        "économies",
      ],
    },
    es: {
      description:
        "Conoce VendGros, el mercado canadiense líder para comprar y vender productos al por mayor localmente.",
      keywords: [
        "mercado mayorista Canadá",
        "compra al por mayor",
        "venta al por mayor",
        "ahorro",
      ],
    },
  },

  careers: {
    en: {
      description:
        "Explore career opportunities at VendGros. Join our mission to revolutionize how Canadians buy and sell bulk goods.",
      keywords: [
        "VendGros careers",
        "jobs at VendGros",
        "marketplace jobs Canada",
        "tech startup jobs",
      ],
    },
    fr: {
      description:
        "Explorez les opportunités de carrière chez VendGros. Rejoignez notre mission de révolutionner le commerce en gros au Canada.",
      keywords: [
        "carrières VendGros",
        "emplois VendGros",
        "emplois tech",
        "startup Montréal",
      ],
    },
    es: {
      description:
        "Explora oportunidades de carrera en VendGros. Únete a nuestra misión de revolucionar el comercio mayorista.",
      keywords: ["empleo VendGros", "trabajos VendGros", "empleos tech", "startup"],
    },
  },

  contact: {
    en: {
      description:
        "Have questions? Contact the VendGros team for support, partnerships, or press inquiries. We're here to help.",
      keywords: [
        "contact VendGros",
        "VendGros support",
        "customer service",
        "help VendGros",
      ],
    },
    fr: {
      description:
        "Des questions? Contactez l'équipe VendGros pour le support, les partenariats ou les demandes presse.",
      keywords: ["contacter VendGros", "support VendGros", "service client", "aide"],
    },
    es: {
      description:
        "¿Tienes preguntas? Contacta al equipo de VendGros para soporte, asociaciones o consultas de prensa.",
      keywords: [
        "contactar VendGros",
        "soporte VendGros",
        "servicio al cliente",
        "ayuda",
      ],
    },
  },

  cookies: {
    en: {
      description:
        "Learn how VendGros uses cookies to improve your experience. Manage your cookie preferences here.",
      keywords: ["cookie policy", "cookies", "privacy", "tracking", "preferences"],
    },
    fr: {
      description:
        "Découvrez comment VendGros utilise les cookies pour améliorer votre expérience. Gérez vos préférences ici.",
      keywords: ["politique cookies", "cookies", "vie privée", "suivi"],
    },
    es: {
      description:
        "Descubre cómo VendGros usa cookies para mejorar tu experiencia. Gestiona tus preferencias aquí.",
      keywords: ["política cookies", "cookies", "privacidad", "seguimiento"],
    },
  },

  fees: {
    en: {
      description:
        "Understand VendGros selling fees. Transparent pricing with no hidden costs. Start selling bulk goods today.",
      keywords: [
        "VendGros selling fees",
        "marketplace fees",
        "commission rates",
        "selling costs",
      ],
    },
    fr: {
      description:
        "Comprenez les frais de vente VendGros. Tarification transparente sans frais cachés.",
      keywords: [
        "frais vente VendGros",
        "commission",
        "coûts de vente",
        "tarifs marketplace",
      ],
    },
    es: {
      description:
        "Comprende las tarifas de venta de VendGros. Precios transparentes sin costos ocultos.",
      keywords: [
        "tarifas venta VendGros",
        "comisión",
        "costos de venta",
        "tarifas marketplace",
      ],
    },
  },

  help: {
    en: {
      description:
        "Find answers to common questions about buying and selling on VendGros. Guides, tutorials, and troubleshooting.",
      keywords: [
        "VendGros help",
        "support",
        "FAQ",
        "how to sell",
        "how to buy",
      ],
    },
    fr: {
      description:
        "Trouvez des réponses à vos questions sur l'achat et la vente sur VendGros. Guides et tutoriels.",
      keywords: [
        "aide VendGros",
        "support",
        "FAQ",
        "comment vendre",
        "comment acheter",
      ],
    },
    es: {
      description:
        "Encuentra respuestas a preguntas comunes sobre comprar y vender en VendGros. Guías y tutoriales.",
      keywords: [
        "ayuda VendGros",
        "soporte",
        "FAQ",
        "cómo vender",
        "cómo comprar",
      ],
    },
  },

  "privacy-policy": {
    en: {
      description:
        "Read VendGros privacy policy. Learn how we collect, use, and protect your personal information.",
      keywords: [
        "VendGros privacy policy",
        "data protection",
        "PIPEDA",
        "privacy rights",
      ],
    },
    fr: {
      description:
        "Lisez la politique de confidentialité VendGros. Découvrez comment nous protégeons vos données personnelles.",
      keywords: [
        "politique confidentialité VendGros",
        "protection données",
        "vie privée",
        "LPRPDE",
      ],
    },
    es: {
      description:
        "Lee la política de privacidad de VendGros. Conoce cómo protegemos tu información personal.",
      keywords: [
        "política privacidad VendGros",
        "protección de datos",
        "privacidad",
        "derechos",
      ],
    },
  },

  safety: {
    en: {
      description:
        "Stay safe when buying and selling on VendGros. Tips for secure transactions and meeting safely.",
      keywords: [
        "VendGros safety",
        "safe buying",
        "secure selling",
        "meetup safety",
      ],
    },
    fr: {
      description:
        "Restez en sécurité lors de vos achats et ventes sur VendGros. Conseils pour des transactions sécurisées.",
      keywords: [
        "sécurité VendGros",
        "achat sécurisé",
        "vente sécurisée",
        "rencontre sûre",
      ],
    },
    es: {
      description:
        "Mantente seguro al comprar y vender en VendGros. Consejos para transacciones y reuniones seguras.",
      keywords: [
        "seguridad VendGros",
        "compra segura",
        "venta segura",
        "reunión segura",
      ],
    },
  },

  "terms-of-service": {
    en: {
      description:
        "Review VendGros terms of service. Rules and guidelines for using the marketplace.",
      keywords: [
        "VendGros terms",
        "user agreement",
        "marketplace rules",
        "policies",
      ],
    },
    fr: {
      description:
        "Consultez les conditions d'utilisation VendGros. Règles et directives pour utiliser la plateforme.",
      keywords: ["conditions VendGros", "accord utilisateur", "règles marketplace"],
    },
    es: {
      description:
        "Revisa los términos de servicio de VendGros. Reglas y directrices para usar el mercado.",
      keywords: ["términos VendGros", "acuerdo de usuario", "reglas del mercado"],
    },
  },

  "how-it-works": {
    en: {
      description:
        "Discover how VendGros connects buyers and sellers of bulk goods. Simple, local, and affordable.",
      keywords: [
        "how VendGros works",
        "buy bulk",
        "sell bulk",
        "bulk deals",
        "wholesale",
      ],
    },
    fr: {
      description:
        "Découvrez comment VendGros connecte acheteurs et vendeurs de produits en gros. Simple, local, abordable.",
      keywords: [
        "comment fonctionne VendGros",
        "acheter en gros",
        "vendre en gros",
        "économies",
      ],
    },
    es: {
      description:
        "Descubre cómo VendGros conecta compradores y vendedores de productos al por mayor. Simple, local, económico.",
      keywords: [
        "cómo funciona VendGros",
        "comprar al por mayor",
        "vender al por mayor",
      ],
    },
  },
};

/**
 * Get SEO config for a page and locale
 */
export function getPageSeo(
  routeSlug: CMSSlug,
  locale: CMSLocale
): PageSeoConfig {
  const pageConfig = seoConfig[routeSlug];
  return pageConfig[locale] ?? pageConfig.en;
}
