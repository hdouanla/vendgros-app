import slidesJson from "./slides.json";

export interface HeroSlide {
  titleKey: string;
  subtitleKey: string;
  descriptionKey: string;
  ctaTextKey: string;
  ctaHref?: string;
  backgroundImage: string;
}

export const DEFAULT_CTA_HREF = "/listings/search" as const;

export const slides = slidesJson as HeroSlide[];
