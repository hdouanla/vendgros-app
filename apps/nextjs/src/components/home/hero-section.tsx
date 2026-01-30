"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { slides, DEFAULT_CTA_HREF } from "~/lib/hero-slides";
const AUTO_ADVANCE_MS = 5500;
const TRANSITION_MS = 400;

export function HeroSection() {
  const t = useTranslations("home");
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      setIndex((i) => {
        const len = slides.length;
        if (next < 0) return (i + len - 1) % len;
        if (next >= len) return 0;
        return next;
      });
    },
    []
  );

  const next = useCallback(() => goTo(index + 1), [index, goTo]);
  const prev = useCallback(() => goTo(index - 1), [index, goTo]);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(next, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [isPaused, index, next]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prev, next]);

  return (
    <section
      className="relative h-[50vh] min-h-[320px] max-h-[480px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Hero slideshow"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.backgroundImage}
          className="absolute inset-0 transition-opacity duration-300 ease-out"
          style={{
            opacity: i === index ? 1 : 0,
            transitionDuration: `${TRANSITION_MS}ms`,
            pointerEvents: i === index ? "auto" : "none",
          }}
          aria-hidden={i !== index}
        >
          {/* Background */}
          <div className="absolute inset-0">
            <Image
              src={slide.backgroundImage}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority={i === 0}
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(250,241,229,0.97)_0%,rgba(250,241,229,0.7)_40%,transparent_100%)]" />
          </div>

          {/* Content */}
          <div className="relative flex h-full items-center">
            <div className="mx-auto w-full max-w-content px-4 py-8 md:py-10 lg:py-12">
              <p className="mb-2 text-base font-semibold uppercase tracking-wider text-[#067a04] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] md:text-lg">
                {t(slide.subtitleKey)}
              </p>
              <h1 className="mb-4 text-4xl font-bold tracking-tight text-[#07100c] md:text-5xl lg:text-6xl [text-shadow:0_1px_2px_rgba(255,255,255,0.9),0_0_20px_rgba(255,255,255,0.5)]">
                {t(slide.titleKey)}
              </h1>
              <p className="mb-5 max-w-xl text-lg text-gray-900 md:text-xl">
                {t(slide.descriptionKey)}
              </p>
              <Link
                href={slide.ctaHref ?? DEFAULT_CTA_HREF}
                className="inline-flex items-center rounded-md bg-[#0DAE09] px-6 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-[#0B9507] [text-shadow:0_1px_1px_rgba(0,0,0,0.2)]"
              >
                {t(slide.ctaTextKey)}
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Dots - centered, above search box overlap */}
      <div
        className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 gap-2.5 md:bottom-16"
        role="tablist"
        aria-label="Slide navigation"
      >
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className="h-3.5 w-3.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0DAE09] focus:ring-offset-2 md:h-4 md:w-4"
            style={{
              backgroundColor: i === index ? "#0DAE09" : "rgba(0,0,0,0.3)",
            }}
          />
        ))}
      </div>
    </section>
  );
}
