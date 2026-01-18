"use client";

import React, { useEffect, useCallback, useState } from "react";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  alt?: string;
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
  alt = "Image",
}: ImageLightboxProps) {
  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || images.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        onIndexChange(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
      } else if (e.key === "ArrowRight") {
        onIndexChange(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, images.length, currentIndex, onClose, onIndexChange]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const goToPrevious = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onIndexChange(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
    },
    [currentIndex, images.length, onIndexChange]
  );

  const goToNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onIndexChange(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
    },
    [currentIndex, images.length, onIndexChange]
  );

  if (!isOpen || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div className="relative h-full w-full max-w-7xl p-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          aria-label="Close"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Previous image"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Next image"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute left-4 top-4 z-10 rounded-full bg-black/50 px-3 py-1 text-sm text-white backdrop-blur-sm">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Main Image */}
        <div
          className="flex h-full w-full items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={images[currentIndex]}
            alt={`${alt} - Photo ${currentIndex + 1}`}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 z-10 flex max-w-full -translate-x-1/2 gap-2 overflow-x-auto rounded-lg bg-black/50 p-2 backdrop-blur-sm">
            {images.map((photo, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange(idx);
                }}
                className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded transition-all ${
                  currentIndex === idx
                    ? "ring-2 ring-white ring-offset-2 ring-offset-black/50"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={photo}
                  alt={`Thumbnail ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Smaller image gallery component with built-in lightbox (thumbnails only)
interface ImageGalleryProps {
  images: string[];
  alt?: string;
  thumbnailSize?: "sm" | "md" | "lg";
  className?: string;
}

export function ImageGallery({
  images,
  alt = "Image",
  thumbnailSize = "md",
  className = "",
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}>
        No photos
      </div>
    );
  }

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  return (
    <>
      <div className={`flex gap-2 overflow-x-auto ${className}`}>
        {images.map((photo, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSelectedIndex(idx);
              setShowLightbox(true);
            }}
            className={`${sizeClasses[thumbnailSize]} flex-shrink-0 overflow-hidden rounded object-cover transition-opacity hover:opacity-80`}
          >
            <img
              src={photo}
              alt={`${alt} ${idx + 1}`}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      <ImageLightbox
        images={images}
        currentIndex={selectedIndex}
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        onIndexChange={setSelectedIndex}
        alt={alt}
      />
    </>
  );
}

// Full gallery with main image preview and thumbnail selector (like frontend listing page)
interface ImageGalleryWithPreviewProps {
  images: string[];
  alt?: string;
  mainImageAspect?: "video" | "square" | "auto";
  thumbnailColumns?: 3 | 4 | 5 | 6;
  className?: string;
}

export function ImageGalleryWithPreview({
  images,
  alt = "Image",
  mainImageAspect = "video",
  thumbnailColumns = 4,
  className = "",
}: ImageGalleryWithPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className={`aspect-video flex items-center justify-center rounded-lg bg-gray-200 text-gray-400 ${className}`}>
        No photos
      </div>
    );
  }

  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    auto: "",
  };

  const gridColsClasses = {
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Image */}
      <div className={`${aspectClasses[mainImageAspect]} overflow-hidden rounded-lg bg-gray-200`}>
        <button
          onClick={() => setShowLightbox(true)}
          className="group relative h-full w-full cursor-zoom-in"
        >
          <img
            src={images[selectedIndex]}
            alt={alt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/20">
            <div className="flex items-center gap-2 rounded-lg bg-black/60 px-4 py-2 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
              <span className="text-sm font-medium">Click to enlarge</span>
            </div>
          </div>
        </button>
      </div>

      {/* Thumbnail Grid */}
      {images.length > 1 && (
        <div className={`grid ${gridColsClasses[thumbnailColumns]} gap-2`}>
          {images.map((photo, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`aspect-square overflow-hidden rounded-lg bg-gray-200 transition-all ${
                selectedIndex === idx
                  ? "ring-2 ring-green-500 ring-offset-2"
                  : "hover:opacity-75"
              }`}
            >
              <img
                src={photo}
                alt={`${alt} ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <ImageLightbox
        images={images}
        currentIndex={selectedIndex}
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        onIndexChange={setSelectedIndex}
        alt={alt}
      />
    </div>
  );
}
