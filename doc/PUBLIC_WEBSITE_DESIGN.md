# VendGros Public Website Design Documentation

> A comprehensive design specification for the responsive public-facing pages of VendGros - Canada's community marketplace for bulk deals.

---

## Executive Summary (1-Page Overview)

### Brand Identity

| Element | Specification |
|---------|---------------|
| **Logo Symbol** | Isometric 3D cubes/boxes (bulk wholesale concept) |
| **Primary Color** | VendGros Green `#0DAE09` |
| **Secondary Color** | VendGros Dark `#0B4D26` |
| **Accent Color** | VendGros Orange `#F5841F` |
| **Background** | VendGros Beige `#FAF1E5` (optional) |
| **Brand Font** | Gilroy (headings, logo text) |
| **UI Font** | Geist Sans (body, interface) |

*Logo designed by Christetian NGOUMESSI, Graphic Designer*

### Project Scope
Redesign of the VendGros public-facing home page to improve user engagement and conversion.

### Home Page Sections (Top to Bottom)

| Section | Purpose | Height | Content |
|---------|---------|--------|---------|
| **Navbar** | Navigation | 64px | Logo, links, auth |
| **Hero Slider** | Explain how it works | 400-500px | 4 slides, auto-rotate |
| **Search Box** | Primary conversion | 180px | Postal code, category, location |
| **Trust Badges** | Build confidence | 80px | 4 trust indicators |
| **Featured Listings** | Showcase best items | Variable | 8 items, masonry grid |
| **Categories** | Browse by type | 400px | 8 category cards |
| **Latest Listings** | Show activity | Variable | 8 items, standard grid |
| **Footer** | Information & links | 300px | 4 columns + copyright |

### Key Metrics & Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | > 90 |
| LCP (Largest Contentful Paint) | < 2.5s |
| Mobile Responsive | 375px - 1536px |
| Accessibility | WCAG AA compliant |

### Technical Requirements

- **Stack**: Next.js 15, Tailwind CSS v4, shadcn/ui
- **Fonts**: Gilroy (brand/headings), Geist Sans (UI/body)
- **New Dependencies**: embla-carousel-react, react-masonry-css, Gilroy font files
- **New API Endpoints**: 3 (getFeatured, getLatest, getCategoryCounts)
- **New Components**: 7 (HeroSlider, SearchBox, CategoryGrid, FeaturedListings, LatestListings, TrustBadges, Footer)

### Timeline Estimate

| Phase | Scope |
|-------|-------|
| Phase 1 | Foundation (layout, footer, dependencies) |
| Phase 2 | Home page components |
| Phase 3 | Polish (animations, dark mode, testing) |
| Phase 4 | Optimization & launch |

### Success Criteria

1. All 5 home page sections implemented per spec
2. Responsive across all breakpoints
3. Lighthouse score > 90
4. All pre-launch checklist items complete

---

## Quick Start Guide

### For Developers - Get Started in 5 Minutes

**1. Install dependencies:**
```bash
cd apps/nextjs
pnpm add embla-carousel-react embla-carousel-autoplay react-masonry-css
```

**2. Create the home page components:**
```
src/components/home/
├── hero-slider.tsx      # Copy from Section 16.1
├── search-box.tsx       # Copy from Section 16.2
├── category-grid.tsx    # Copy from Section 16.3
├── featured-listings.tsx # Copy from Section 16.4
└── latest-listings.tsx  # Reuse ListingCard grid
```

**3. Add API endpoints** (Section 17):
- `listing.getFeatured`
- `listing.getLatest`
- `listing.getCategoryCounts`

**4. Update `app/page.tsx`** with new home page (Section 19)

**5. Create footer** `components/layout/footer.tsx` (Section 16.5)

### Home Page Section Order

```
┌────────────────────────────┐
│         NAVBAR             │
├────────────────────────────┤
│      HERO SLIDER           │  ← 4 slides explaining how it works
├────────────────────────────┤
│      SEARCH BOX            │  ← Postal code + category + location
├────────────────────────────┤
│   FEATURED LISTINGS        │  ← Masonry grid, 8 items
├────────────────────────────┤
│     CATEGORIES             │  ← 8 category cards with images
├────────────────────────────┤
│   LATEST LISTINGS          │  ← Standard grid, 8 items
├────────────────────────────┤
│        FOOTER              │
└────────────────────────────┘
```

### Key Files to Modify

| File | Action |
|------|--------|
| `apps/nextjs/src/app/page.tsx` | Replace with new home page |
| `apps/nextjs/src/app/layout.tsx` | Add Footer component |
| `packages/api/src/router/listing.ts` | Add 3 new endpoints |

---

## Table of Contents

**Part I: Design Foundation**
1. [Project Overview](#1-project-overview)
2. [Design System](#2-design-system)
3. [Global Layout](#3-global-layout)

**Part II: Home Page**
4. [Home Page Design](#4-home-page-design)
5. [Component Specifications](#5-component-specifications)
6. [Responsive Breakpoints](#6-responsive-breakpoints)

**Part III: Future & Guidelines**
7. [Internal Pages (Future)](#7-internal-pages-future)
8. [Implementation Guidelines](#8-implementation-guidelines)

**Part IV: Advanced Specifications**
9. [Animation & Interaction Specifications](#9-animation--interaction-specifications)
10. [Image & Asset Requirements](#10-image--asset-requirements)
11. [Trust Signals & Social Proof](#11-trust-signals--social-proof)
12. [Mobile-First Wireframes](#12-mobile-first-wireframes)
13. [Dark Mode Considerations](#13-dark-mode-considerations)
14. [Internationalization (i18n) Keys](#14-internationalization-i18n-keys)

**Part V: Implementation**
15. [Implementation Checklist](#15-implementation-checklist)
16. [Ready-to-Use Component Templates](#16-ready-to-use-component-templates)
17. [API Endpoints Implementation](#17-api-endpoints-implementation)
18. [Conversion Optimization Guidelines](#18-conversion-optimization-guidelines)
19. [Complete Home Page Implementation](#19-complete-home-page-implementation)
20. [Design Tokens (TypeScript)](#20-design-tokens-typescript)
21. [Testing Requirements](#21-testing-requirements)

**Appendices**
- [Appendix A: Color Reference Quick Sheet](#appendix-a-color-reference-quick-sheet)
- [Appendix B: Icon Library](#appendix-b-icon-library)
- [Appendix C: Performance Budget](#appendix-c-performance-budget)
- [Appendix D: Pre-Launch Checklist](#appendix-d-pre-launch-checklist)

---

## 1. Project Overview

### 1.1 About VendGros

VendGros is a Canadian community marketplace for buying and selling bulk items locally. The platform connects buyers seeking deals on bulk purchases with sellers (individuals and merchants) who have surplus inventory.

### 1.2 Business Model

- **5% Deposit System**: Buyers pay a 5% deposit to reserve items
- **Local Pickup**: All transactions involve local pickup with QR code verification
- **Bi-directional Ratings**: Both buyers and sellers rate each other

### 1.3 Technical Stack

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Fonts**: Gilroy (brand/headings), Geist Sans (body), Geist Mono (code)
- **Theme**: Light/Dark mode support via CSS variables

### 1.4 Brand Identity

The VendGros logo consists of:
- **Logo Symbol**: Isometric 3D cubes/boxes representing bulk packaging and wholesale
- **Logotype**: "VendGros" with "Vend" in dark green (#0B4D26) and "Gros" in bright green (#0DAE09)
- **Concept**: Box + Cube = Bulk wholesale marketplace

*Logo designed by Christetian NGOUMESSI, Graphic Designer*

### 1.5 Target Audience

- **Primary**: Canadian consumers and small businesses looking for bulk deals
- **Secondary**: Merchants with surplus inventory, wholesalers
- **Demographics**: Age 25-55, cost-conscious, environmentally aware

---

## 2. Design System

### 2.1 Color Palette

#### Brand Colors (from Official Logo Design)
```css
/* Primary - VendGros Green (Logo Symbol & "Gros" text) */
--vendgros-green: #0DAE09;              /* Bright green - primary brand color */
--vendgros-green-rgb: 13, 174, 9;
--vendgros-green-hsl: 118, 90%, 36%;

/* Secondary - VendGros Dark Green ("Vend" text) */
--vendgros-dark: #0B4D26;               /* Dark green - secondary brand color */
--vendgros-dark-rgb: 11, 77, 38;
--vendgros-dark-hsl: 144, 75%, 17%;

/* Accent - VendGros Orange */
--vendgros-orange: #F5841F;             /* Orange accent from brand palette */
--vendgros-orange-rgb: 245, 132, 31;

/* Background - VendGros Beige */
--vendgros-beige: #FAF1E5;              /* Warm beige background option */
--vendgros-beige-rgb: 250, 241, 229;

/* Mapped to Tailwind/CSS Variables */
--primary: #0DAE09;                     /* VendGros Green */
--primary-hover: #0B9507;               /* Slightly darker green */
--primary-dark: #0B4D26;                /* VendGros Dark Green */
--primary-light: #E8F8E8;               /* Light green tint */

/* Accent Colors */
--accent-orange: #F5841F;               /* VendGros Orange - for CTAs, highlights */
--accent-yellow: oklch(0.80 0.15 85);   /* For warnings */
--accent-blue: oklch(0.65 0.12 250);    /* For info states */

/* Neutrals */
--background: #ffffff;                  /* White (or #FAF1E5 beige) */
--foreground: #171717;                  /* Near black */
--muted: #f5f5f5;
--muted-foreground: #737373;
--border: #e5e5e5;
```

#### Dark Mode Colors
```css
--background: oklch(0.10 0 0);          /* Near black */
--foreground: oklch(0.95 0 0);          /* Off-white */
--muted: oklch(0.20 0 0);               /* Dark gray */
--border: oklch(0.25 0 0);              /* Subtle border */
/* Note: VendGros Green (#0DAE09) remains vibrant in dark mode */
```

#### Color Usage Guidelines
| Color | Hex | Usage |
|-------|-----|-------|
| VendGros Green | #0DAE09 | Logo symbol, primary buttons, links, success states |
| VendGros Dark | #0B4D26 | Logo "Vend" text, dark backgrounds, footer |
| VendGros Orange | #F5841F | CTAs, featured badges, highlights, promotions |
| VendGros Beige | #FAF1E5 | Hero backgrounds, card backgrounds (optional) |

### 2.2 Typography Scale

```css
/* Font Families (from Brand Guidelines) */

/* Gilroy - Brand/Display Font (for logo, headings, marketing) */
--font-gilroy: 'Gilroy', sans-serif;

/* Geist Sans - UI/Body Font (for interface elements) */
--font-geist-sans: var(--font-geist-sans), system-ui, sans-serif;

/* Geist Mono - Code Font */
--font-geist-mono: var(--font-geist-mono), monospace;

/* Usage Guidelines:
   - Gilroy: Logo text, hero headings, marketing headlines
   - Geist Sans: Body text, UI elements, form labels, buttons
   - Geist Mono: Code snippets, technical content
*/

/* Type Scale (rem) */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */
--text-6xl: 3.75rem;   /* 60px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800; /* For Gilroy display text */

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

#### Font Loading (Next.js)
```tsx
// For Gilroy (self-hosted or via font service)
import localFont from 'next/font/local';

const gilroy = localFont({
  src: [
    { path: './fonts/Gilroy-Regular.woff2', weight: '400' },
    { path: './fonts/Gilroy-Medium.woff2', weight: '500' },
    { path: './fonts/Gilroy-SemiBold.woff2', weight: '600' },
    { path: './fonts/Gilroy-Bold.woff2', weight: '700' },
    { path: './fonts/Gilroy-ExtraBold.woff2', weight: '800' },
  ],
  variable: '--font-gilroy',
});
```

### 2.3 Spacing System

```css
/* Base unit: 4px (0.25rem) */
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### 2.4 Border Radius

```css
--radius-sm: 0.375rem;   /* 6px - Small elements */
--radius-md: 0.5rem;     /* 8px - Buttons, inputs */
--radius-lg: 0.75rem;    /* 12px - Cards */
--radius-xl: 1rem;       /* 16px - Modals, large cards */
--radius-2xl: 1.5rem;    /* 24px - Hero sections */
--radius-full: 9999px;   /* Pills, avatars */
```

### 2.5 Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

---

## 3. Global Layout

### 3.1 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                       NAVBAR                             │
│  Logo    Search    Browse | Sell   [User Menu/Auth]     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                    MAIN CONTENT                          │
│                    (Page-specific)                       │
│                                                          │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                       FOOTER                             │
│  About | Contact | Privacy | Terms | Social             │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Navbar Specifications

**Desktop (≥1024px)**
```
┌──────────────────────────────────────────────────────────────┐
│  [📦] VendGros   Search Listings    Create Listing  │ 👤 ▼   │
│                  [📊 Dashboard]     [💬 Chats(3)]           │
└──────────────────────────────────────────────────────────────┘

Logo: [Cube Symbol] + "Vend" (dark green #0B4D26) + "Gros" (bright green #0DAE09)
```

- **Height**: 64px (h-16)
- **Background**: White (light) / Gray-900 (dark)
- **Border**: Bottom border gray-200
- **Max Width**: Container (1280px) centered
- **Padding**: px-4 (16px) to px-8 (32px)
- **Logo Font**: Gilroy Bold

**Logo Component**
```tsx
<Link href="/" className="inline-flex items-center gap-2">
  <img src="/logo-icon.svg" alt="" className="h-8 w-8" />
  <span className="font-gilroy text-xl font-bold">
    <span className="text-[#0B4D26]">Vend</span>
    <span className="text-[#0DAE09]">Gros</span>
  </span>
</Link>
```

**Mobile (< 1024px)**
```
┌──────────────────────────────────┐
│  [📦] VendGros            ≡     │
└──────────────────────────────────┘
│ Search Listings                  │
│ Create Listing                   │
│ Dashboard                        │
│ Chats (3)                        │
│ ─────────────                    │
│ Sign In / Sign Up                │
└──────────────────────────────────┘
```

- **Hamburger Menu**: Right-aligned
- **Dropdown**: Full-width, slide down animation
- **Transitions**: 200ms ease-in-out

### 3.3 Footer Specifications

**Desktop Layout**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [📦] VendGros                                                  │
│  Canada's marketplace for bulk deals                            │
│                                                                  │
│  COMPANY           SUPPORT            LEGAL            CONNECT   │
│  About Us          Help Center        Privacy Policy   Facebook  │
│  How It Works      Contact Us         Terms of Service Twitter   │
│  Careers           Safety Tips        Cookie Policy    Instagram │
│                    FAQ                                  LinkedIn  │
│                                                                  │
│  ──────────────────────────────────────────────────────────────  │
│  © 2026 VendGros Inc. All rights reserved.        🇨🇦 Canada    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Footer Logo: Use full color logo on light backgrounds, white logo on dark backgrounds
```

**Mobile Layout** (stacked single column)

- **Background**: Gray-50 (light) / VendGros Dark (#0B4D26) optional / Gray-950 (dark)
- **Padding**: py-12 to py-16
- **Link Color**: Gray-600 hover:Gray-900
- **On Dark Footer**: Use VendGros Green (#0DAE09) for "VendGros" text

---

## 4. Home Page Design

### 4.1 Complete Section Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         NAVBAR                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              HERO SLIDER                               │  │
│  │         "How VendGros Works"                          │  │
│  │    [Slide 1] [Slide 2] [Slide 3]                      │  │
│  │         ○ ● ○                                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              SEARCH BOX                                │  │
│  │    🔍 [Postal Code   ] [Category ▼] [Search]          │  │
│  │        📍 Use My Location                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           FEATURED LISTINGS (Masonry Grid)            │  │
│  │    ┌─────┐ ┌───────┐ ┌─────┐                         │  │
│  │    │     │ │       │ │     │                         │  │
│  │    │  1  │ │   2   │ │  3  │ ...                     │  │
│  │    │     │ │       │ │     │                         │  │
│  │    └─────┘ └───────┘ └─────┘                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           CATEGORIES (Image Grid)                      │  │
│  │    ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │  │
│  │    │🥬   │ │👕   │ │📱   │ │🏠   │               │  │
│  │    │Grocer│ │Cloth │ │Electr│ │Home  │               │  │
│  │    └──────┘ └──────┘ └──────┘ └──────┘               │  │
│  │    ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │  │
│  │    │🎮   │ │⚽   │ │📚   │ │📦   │               │  │
│  │    │Toys  │ │Sports│ │Books │ │Other │               │  │
│  │    └──────┘ └──────┘ └──────┘ └──────┘               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           LATEST LISTINGS (Grid)                       │  │
│  │    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │  │
│  │    │     │ │     │ │     │ │     │                   │  │
│  │    │  1  │ │  2  │ │  3  │ │  4  │                   │  │
│  │    │     │ │     │ │     │ │     │                   │  │
│  │    └─────┘ └─────┘ └─────┘ └─────┘                   │  │
│  │                 [View All Listings →]                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                         FOOTER                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.1.1 Section Measurements Reference

| Section | Mobile (375px) | Tablet (768px) | Desktop (1280px) |
|---------|----------------|----------------|------------------|
| **Navbar** | h-16 (64px) | h-16 (64px) | h-16 (64px) |
| **Hero Slider** | h-[400px] | h-[450px] | h-[500px] |
| **Search Box** | py-6, -mt-6 overlap | py-8, -mt-8 overlap | py-8, -mt-10 overlap |
| **Trust Badges** | py-6 | py-6 | py-6 |
| **Featured Section** | py-12 | py-12 | py-16 |
| **Categories Section** | py-12 | py-12 | py-16 |
| **Latest Section** | py-12 | py-12 | py-16 |
| **Footer** | py-12 | py-12 | py-16 |

### 4.1.2 Container & Grid Specifications

```css
/* Container */
.container {
  max-width: 1280px;  /* xl breakpoint */
  margin: 0 auto;
  padding-left: 16px;   /* px-4 mobile */
  padding-right: 16px;
}

@media (min-width: 768px) {
  .container {
    padding-left: 32px;  /* px-8 tablet+ */
    padding-right: 32px;
  }
}

/* Grid gaps */
--gap-cards: 16px;      /* gap-4 */
--gap-sections: 48px;   /* py-12 */
--gap-sections-lg: 64px; /* py-16 */
```

### 4.1.3 Card Dimensions

| Card Type | Mobile | Tablet | Desktop | Aspect Ratio |
|-----------|--------|--------|---------|--------------|
| Listing Card | ~165px wide | ~230px wide | ~290px wide | 16:9 image + content |
| Category Card | ~165px | ~230px | ~290px | 1:1 square |
| Featured Card | ~165px | ~230px | ~290px | Variable (masonry) |

---

### 4.2 Section 1: Hero Slider

#### Purpose
Introduce new visitors to VendGros by explaining the platform in 3-4 simple steps with engaging visuals.

#### Slide Content

**Slide 1: "Find Local Bulk Deals"**
```
┌─────────────────────────────────────────────────────────────┐
│  Background: Gradient green-50 to white                      │
│                                                              │
│     [Illustration: Map with location pins]                   │
│                                                              │
│     📍 FIND LOCAL BULK DEALS                                │
│                                                              │
│     Search for bulk items near you using                    │
│     your postal code or current location.                   │
│                                                              │
│     [Browse Listings →]                                      │
│                                                              │
│                    ● ○ ○ ○                                   │
└─────────────────────────────────────────────────────────────┘
```

**Slide 2: "Reserve with 5% Deposit"**
```
┌─────────────────────────────────────────────────────────────┐
│  Background: Gradient green-100 to green-50                  │
│                                                              │
│     [Illustration: Credit card with checkmark]              │
│                                                              │
│     💳 SECURE YOUR DEAL                                     │
│                                                              │
│     Reserve items with just 5% deposit.                     │
│     Pay the rest when you pick up.                          │
│                                                              │
│     [How Deposits Work →]                                   │
│                                                              │
│                    ○ ● ○ ○                                   │
└─────────────────────────────────────────────────────────────┘
```

**Slide 3: "Pick Up & Verify"**
```
┌─────────────────────────────────────────────────────────────┐
│  Background: Gradient white to green-50                      │
│                                                              │
│     [Illustration: QR code being scanned]                   │
│                                                              │
│     📱 SAFE PICKUP                                          │
│                                                              │
│     Meet the seller, scan the QR code,                      │
│     and complete your transaction safely.                   │
│                                                              │
│     [Learn More →]                                          │
│                                                              │
│                    ○ ○ ● ○                                   │
└─────────────────────────────────────────────────────────────┘
```

**Slide 4: "Rate & Build Trust"**
```
┌─────────────────────────────────────────────────────────────┐
│  Background: Gradient green-50 to white                      │
│                                                              │
│     [Illustration: Star ratings with happy faces]           │
│                                                              │
│     ⭐ BUILD YOUR REPUTATION                                │
│                                                              │
│     Rate buyers and sellers to help                         │
│     build a trusted community.                              │
│                                                              │
│     [Start Selling →]                                       │
│                                                              │
│                    ○ ○ ○ ●                                   │
└─────────────────────────────────────────────────────────────┘
```

#### Slider Specifications

| Property | Value |
|----------|-------|
| Height | Mobile: 400px, Tablet: 450px, Desktop: 500px |
| Width | Full viewport width |
| Auto-play | Yes, 5 seconds per slide |
| Transition | Fade or slide, 500ms ease |
| Indicators | Dots at bottom center |
| Navigation | Arrows on hover (desktop), swipe (mobile) |
| Pause | On hover or touch |

#### Technical Implementation

```tsx
// Recommended: Use Embla Carousel or Swiper
// File: components/home/hero-slider.tsx

interface Slide {
  id: number;
  icon: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
  bgGradient: string;
  illustration: string; // Path to SVG/image
}

const slides: Slide[] = [
  {
    id: 1,
    icon: "📍",
    title: "Find Local Bulk Deals",
    description: "Search for bulk items near you using your postal code or current location.",
    cta: { label: "Browse Listings", href: "/listings/search" },
    bgGradient: "from-green-50 to-white",
    illustration: "/illustrations/map-pins.svg"
  },
  // ... more slides
];
```

---

### 4.3 Section 2: Search Box

#### Design

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│    Find Bulk Deals Near You                                     │
│                                                                  │
│    ┌─────────────────┬───────────────┬────────────┐            │
│    │ 🔍 Postal Code  │ All Categories▼│  Search   │            │
│    │   M5H 2N2       │               │   🔍      │            │
│    └─────────────────┴───────────────┴────────────┘            │
│                                                                  │
│    📍 Use my current location                                   │
│                                                                  │
│    Popular: Groceries • Electronics • Clothing                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Specifications

| Property | Value |
|----------|-------|
| Background | White with shadow-lg |
| Border Radius | radius-xl (16px) |
| Padding | p-6 (24px) to p-8 (32px) |
| Max Width | 800px |
| Position | Centered, negative margin overlap with hero |

#### Search Input Group

```tsx
// Desktop: Horizontal inline form
// Mobile: Stacked vertical form

<div className="flex flex-col md:flex-row gap-3">
  <div className="flex-1 relative">
    <input
      type="text"
      placeholder="Enter postal code (e.g., M5H 2N2)"
      className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#0DAE09]"
    />
    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
  </div>

  <select className="px-4 py-3 border rounded-lg min-w-[160px]">
    <option value="">All Categories</option>
    <option value="GROCERIES">Groceries</option>
    <option value="CLOTHING">Clothing</option>
    <!-- ... other categories -->
  </select>

  <button className="px-6 py-3 bg-[#0DAE09] text-white rounded-lg hover:bg-[#0B9507]">
    Search
  </button>
</div>
```

#### Available Categories (from codebase)

| Category | Display Name | Icon |
|----------|--------------|------|
| GROCERIES | Groceries | 🥬 |
| CLOTHING | Clothing | 👕 |
| ELECTRONICS | Electronics | 📱 |
| HOME_GOODS | Home & Garden | 🏠 |
| TOYS | Toys & Games | 🎮 |
| SPORTS | Sports & Outdoors | ⚽ |
| BOOKS | Books & Media | 📚 |
| OTHER | Other | 📦 |

---

### 4.4 Section 3: Featured Listings (Masonry)

#### Purpose
Showcase hand-picked or promoted listings to increase engagement and conversions.

#### Design

```
Featured Deals                                    [See All →]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Desktop (4 columns):
┌──────────┬──────────┬──────────┬──────────┐
│          │          │          │          │
│  TALL    │  NORMAL  │  NORMAL  │  TALL    │
│  CARD    │  CARD    │  CARD    │  CARD    │
│          │──────────│──────────│          │
│          │  WIDE    │          │          │
│          │  CARD    │  NORMAL  │          │
└──────────┴──────────┴──────────┴──────────┘

Tablet (3 columns):
┌──────────┬──────────┬──────────┐
│  CARD    │  CARD    │  CARD    │
│──────────│──────────│──────────│
│  CARD    │  CARD    │  CARD    │
└──────────┴──────────┴──────────┘

Mobile (2 columns):
┌──────────┬──────────┐
│  CARD    │  CARD    │
│──────────│──────────│
│  CARD    │  CARD    │
│──────────│──────────│
│  CARD    │  CARD    │
└──────────┴──────────┘
```

#### Featured Card Component

```tsx
interface FeaturedCardProps {
  listing: {
    id: string;
    title: string;
    pricePerPiece: number;
    photos: string[];
    category: string;
    seller: {
      ratingAverage: number;
      verificationBadge: string;
    };
  };
  size?: 'normal' | 'tall' | 'wide';
}
```

**Card Styling**
```
┌─────────────────────────────┐
│  ┌─────────────────────┐    │
│  │                     │    │
│  │      IMAGE          │    │ ← aspect-[4/3] or aspect-[3/4] for tall
│  │                     │    │
│  │   [FEATURED]        │    │ ← Badge overlay (top-left)
│  └─────────────────────┘    │
│                             │
│  Fresh Organic Apples       │ ← Title (line-clamp-2)
│  $2.50/piece                │ ← Price in green-600
│  ⭐ 4.8 • ✓ Verified       │ ← Rating + Badge
│                             │
└─────────────────────────────┘
```

#### Masonry Implementation

```tsx
// Recommended: CSS Grid with Masonry or react-masonry-css

// CSS Grid approach with variable heights
.masonry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 10px;
  gap: 16px;
}

.masonry-item {
  grid-row-end: span var(--row-span);
}

// Or use react-masonry-css for simpler implementation
import Masonry from 'react-masonry-css';

const breakpointColumns = {
  default: 4,
  1280: 4,
  1024: 3,
  768: 2,
  640: 2
};
```

---

### 4.5 Section 4: Browse by Category

#### Purpose
Allow quick navigation to category-specific listings with visual appeal.

#### Design

```
Browse by Category
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Desktop (4 columns):
┌──────────────┬──────────────┬──────────────┬──────────────┐
│              │              │              │              │
│  [GROCERIES  │  [CLOTHING   │  [ELECTRONICS│  [HOME &     │
│   IMAGE]     │   IMAGE]     │   IMAGE]     │   GARDEN]    │
│              │              │              │              │
│   Groceries  │   Clothing   │  Electronics │  Home Goods  │
│   245 items  │   189 items  │   312 items  │   156 items  │
│              │              │              │              │
├──────────────┼──────────────┼──────────────┼──────────────┤
│              │              │              │              │
│  [TOYS       │  [SPORTS     │  [BOOKS      │  [OTHER      │
│   IMAGE]     │   IMAGE]     │   IMAGE]     │   IMAGE]     │
│              │              │              │              │
│   Toys       │   Sports     │   Books      │   Other      │
│   89 items   │   134 items  │   67 items   │   203 items  │
│              │              │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘

Mobile (2 columns, scrollable):
┌─────────┬─────────┐   ← Horizontal scroll
│Groceries│Clothing │
│─────────│─────────│
│Electron.│Home     │
└─────────┴─────────┘
```

#### Category Card Component

```tsx
interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;      // Emoji or icon component
    image: string;     // Background image URL
    itemCount: number; // Dynamic count from API
  };
}
```

**Card Styling**
```
┌───────────────────────────────┐
│                               │
│     [Background Image]        │ ← aspect-square
│                               │
│     ┌─────────────────┐       │ ← Dark overlay gradient
│     │                 │       │
│     │  🥬 Groceries   │       │ ← Icon + Name
│     │  245 listings   │       │ ← Count
│     │                 │       │
│     └─────────────────┘       │
│                               │
└───────────────────────────────┘

Hover state:
- Scale: 1.02
- Shadow: shadow-xl
- Overlay: Lighter opacity
```

#### Category Data

```tsx
const categories = [
  {
    id: 'GROCERIES',
    name: 'Groceries',
    slug: 'groceries',
    icon: '🥬',
    image: '/categories/groceries.jpg',
    description: 'Fresh produce, packaged foods, and more'
  },
  {
    id: 'CLOTHING',
    name: 'Clothing',
    slug: 'clothing',
    icon: '👕',
    image: '/categories/clothing.jpg',
    description: 'Apparel, accessories, and fashion items'
  },
  {
    id: 'ELECTRONICS',
    name: 'Electronics',
    slug: 'electronics',
    icon: '📱',
    image: '/categories/electronics.jpg',
    description: 'Phones, computers, and gadgets'
  },
  {
    id: 'HOME_GOODS',
    name: 'Home & Garden',
    slug: 'home-goods',
    icon: '🏠',
    image: '/categories/home.jpg',
    description: 'Furniture, decor, and garden supplies'
  },
  {
    id: 'TOYS',
    name: 'Toys & Games',
    slug: 'toys',
    icon: '🎮',
    image: '/categories/toys.jpg',
    description: 'Kids toys, board games, and entertainment'
  },
  {
    id: 'SPORTS',
    name: 'Sports & Outdoors',
    slug: 'sports',
    icon: '⚽',
    image: '/categories/sports.jpg',
    description: 'Equipment, apparel, and outdoor gear'
  },
  {
    id: 'BOOKS',
    name: 'Books & Media',
    slug: 'books',
    icon: '📚',
    image: '/categories/books.jpg',
    description: 'Books, movies, music, and more'
  },
  {
    id: 'OTHER',
    name: 'Other',
    slug: 'other',
    icon: '📦',
    image: '/categories/other.jpg',
    description: 'Everything else'
  }
];
```

---

### 4.6 Section 5: Latest Listings

#### Purpose
Display recently posted listings to encourage exploration and show marketplace activity.

#### Design

```
Latest Listings                                   [View All →]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Desktop (4 columns):
┌─────────────┬─────────────┬─────────────┬─────────────┐
│    IMAGE    │    IMAGE    │    IMAGE    │    IMAGE    │
│─────────────│─────────────│─────────────│─────────────│
│ Title here  │ Title here  │ Title here  │ Title here  │
│ $X.XX/piece │ $X.XX/piece │ $X.XX/piece │ $X.XX/piece │
│ ⭐4.5 • 2km │ ⭐4.8 • 5km │ ⭐4.2 • 8km │ ⭐4.9 • 3km │
│ [Category]  │ [Category]  │ [Category]  │ [Category]  │
└─────────────┴─────────────┴─────────────┴─────────────┘
       ...second row...
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Card 5    │   Card 6    │   Card 7    │   Card 8    │
└─────────────┴─────────────┴─────────────┴─────────────┘

Mobile (2 columns):
┌─────────┬─────────┐
│  Card   │  Card   │
│─────────│─────────│
│  Card   │  Card   │
│─────────│─────────│
│  Card   │  Card   │
└─────────┴─────────┘
```

#### Listing Card (Reuse existing component)

Based on existing `listing-card.tsx`:

```tsx
interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    description: string;
    category: string;
    pricePerPiece: number;
    quantityAvailable: number;
    photos: string[];
    distance?: number;
    seller: {
      ratingAverage: number | null;
      ratingCount: number;
    };
  };
}
```

**Card Layout**
```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │        IMAGE            │    │ ← aspect-video (16:9)
│  │                         │    │
│  │                    📍5km│    │ ← Distance badge
│  └─────────────────────────┘    │
│                                 │
│  Fresh Organic Apples Bulk...   │ ← Title (line-clamp-2)
│                                 │
│  Delicious locally grown...     │ ← Description (line-clamp-2)
│                                 │
│  $2.50/piece         50 avail   │ ← Price + Quantity
│                                 │
│  ⭐ 4.8 • 12 reviews            │ ← Seller rating
│                                 │
│  [Groceries]                    │ ← Category badge
│                                 │
└─────────────────────────────────┘
```

---

## 5. Component Specifications

### 5.1 Button Variants

```tsx
// Primary (VendGros Green #0DAE09)
<button className="bg-[#0DAE09] hover:bg-[#0B9507] text-white px-6 py-3 rounded-lg font-semibold transition-colors">
  Primary Action
</button>

// Secondary (Outline)
<button className="border-2 border-[#0DAE09] text-[#0DAE09] hover:bg-[#E8F8E8] px-6 py-3 rounded-lg font-semibold transition-colors">
  Secondary Action
</button>

// Accent (VendGros Orange #F5841F - for promotions/CTAs)
<button className="bg-[#F5841F] hover:bg-[#D46A0C] text-white px-6 py-3 rounded-lg font-semibold transition-colors">
  Featured CTA
</button>

// Ghost (Text only)
<button className="text-[#0DAE09] hover:text-[#0B4D26] hover:underline font-medium">
  Text Link →
</button>

// Sizes
- sm: px-4 py-2 text-sm
- md: px-6 py-3 text-base (default)
- lg: px-8 py-4 text-lg
```

### 5.2 Input Fields

```tsx
// Text Input
<input
  type="text"
  className="w-full px-4 py-3 border border-gray-300 rounded-lg
             focus:outline-none focus:ring-2 focus:ring-[#0DAE09] focus:border-transparent
             placeholder:text-gray-400"
  placeholder="Enter text..."
/>

// Select
<select className="w-full px-4 py-3 border border-gray-300 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-[#0DAE09]
                   bg-white appearance-none cursor-pointer">
  <option>Option 1</option>
</select>
```

### 5.3 Badge/Tag

```tsx
// Category Badge
<span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
  Groceries
</span>

// Status Badge
<span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
  Published
</span>

// Featured Badge
<span className="inline-block px-2 py-1 text-xs font-bold rounded bg-yellow-400 text-yellow-900">
  FEATURED
</span>
```

### 5.4 Section Header

```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
      Section Title
    </h2>
    <p className="mt-1 text-gray-600">
      Optional subtitle or description
    </p>
  </div>
  <a href="/link" className="text-[#0DAE09] hover:text-[#0B9507] font-medium flex items-center gap-1">
    View All
    <ArrowRightIcon className="w-4 h-4" />
  </a>
</div>
```

---

## 6. Responsive Breakpoints

### 6.1 Breakpoint Values

| Name | Min Width | Usage |
|------|-----------|-------|
| `sm` | 640px | Large phones, small tablets |
| `md` | 768px | Tablets portrait |
| `lg` | 1024px | Tablets landscape, laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### 6.2 Grid Columns by Section

| Section | Mobile | sm | md | lg | xl |
|---------|--------|----|----|----|----|
| Hero Slider | 1 | 1 | 1 | 1 | 1 |
| Search Box | Stack | Stack | Inline | Inline | Inline |
| Featured | 2 | 2 | 3 | 4 | 4 |
| Categories | 2 | 2 | 3 | 4 | 4 |
| Latest Listings | 2 | 2 | 3 | 4 | 4 |
| Footer | 1 | 2 | 4 | 4 | 4 |

### 6.3 Typography Scale

| Element | Mobile | Desktop |
|---------|--------|---------|
| Hero Title | text-3xl | text-5xl |
| Section Title | text-2xl | text-3xl |
| Card Title | text-base | text-lg |
| Body Text | text-sm | text-base |
| Small Text | text-xs | text-sm |

### 6.4 Spacing Scale

| Section | Mobile Padding | Desktop Padding |
|---------|----------------|-----------------|
| Page Container | px-4 | px-8 |
| Section | py-8 | py-16 |
| Card | p-4 | p-6 |
| Button | px-4 py-2 | px-6 py-3 |

---

## 7. Internal Pages (Future)

### 7.1 Pages to Design

1. **Search Results Page** (enhance existing)
   - Filter sidebar
   - List/Grid/Map toggle
   - Pagination
   - Sort options

2. **Listing Detail Page** (enhance existing)
   - Image gallery with lightbox
   - Seller profile sidebar
   - Reserve/Contact buttons
   - Related listings

3. **User Profile Page**
   - Public profile view
   - Ratings and reviews
   - Active listings

4. **About Us Page**
   - Company story
   - How it works (expanded)
   - Team section

5. **Help Center**
   - FAQ accordion
   - Contact form
   - Category navigation

6. **Blog/News** (optional)
   - Article list
   - Article detail

---

## 8. Implementation Guidelines

### 8.1 File Structure

```
apps/nextjs/src/
├── app/
│   ├── page.tsx                    # Home page (update)
│   ├── layout.tsx                  # Root layout
│   └── (public)/                   # Public pages group
│       ├── about/page.tsx
│       ├── how-it-works/page.tsx
│       └── help/page.tsx
├── components/
│   ├── home/
│   │   ├── hero-slider.tsx         # NEW
│   │   ├── search-box.tsx          # NEW
│   │   ├── featured-listings.tsx   # NEW
│   │   ├── category-grid.tsx       # NEW
│   │   └── latest-listings.tsx     # NEW
│   ├── layout/
│   │   ├── navbar.tsx              # Update
│   │   └── footer.tsx              # NEW
│   ├── listings/
│   │   └── listing-card.tsx        # Existing
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       └── section-header.tsx      # NEW
└── lib/
    └── constants/
        └── categories.ts           # NEW - Category data
```

### 8.2 Dependencies to Add

```json
{
  "dependencies": {
    "embla-carousel-react": "^8.x",      // Hero slider
    "embla-carousel-autoplay": "^8.x",   // Auto-play plugin
    "react-masonry-css": "^1.x",         // Masonry grid
    "@radix-ui/react-visually-hidden": "^1.x"  // Accessibility
  }
}
```

### 8.3 API Endpoints Needed

```typescript
// New tRPC endpoints for home page

// Get featured listings (curated or top-rated)
listing.getFeatured: {
  input: { limit: number },
  output: Listing[]
}

// Get latest listings
listing.getLatest: {
  input: { limit: number },
  output: Listing[]
}

// Get category counts
listing.getCategoryCounts: {
  input: void,
  output: { category: string; count: number }[]
}
```

### 8.4 SEO Considerations

```tsx
// app/page.tsx metadata
export const metadata: Metadata = {
  title: 'VendGros - Buy and Sell Bulk Items Locally in Canada',
  description: 'Find amazing deals on bulk purchases near you. VendGros connects buyers and sellers for local bulk transactions with secure 5% deposit system.',
  keywords: ['bulk deals', 'wholesale', 'local marketplace', 'Canada', 'buy in bulk'],
  openGraph: {
    title: 'VendGros - Canada\'s Bulk Marketplace',
    description: 'Find amazing deals on bulk purchases near you.',
    images: ['/og-image.jpg'],
    type: 'website',
    locale: 'en_CA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VendGros - Buy and Sell Bulk Items Locally',
    description: 'Find amazing deals on bulk purchases near you.',
    images: ['/twitter-image.jpg'],
  },
  alternates: {
    canonical: 'https://vendgros.com',
    languages: {
      'en-CA': 'https://vendgros.com',
      'fr-CA': 'https://vendgros.com/fr',
    },
  },
};
```

### 8.5 Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint (FCP) | < 1.5s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Time to Interactive (TTI) | < 3.0s |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Lighthouse Performance Score | > 90 |

### 8.6 Accessibility Requirements

- All images must have alt text
- Color contrast ratio ≥ 4.5:1 for text
- Focus states visible on all interactive elements
- Keyboard navigation support
- ARIA labels for icons and buttons
- Skip navigation link for screen readers

---

## Appendix A: Color Reference Quick Sheet

### VendGros Brand Colors
```
VendGros Green:   #0DAE09  (Primary - logo symbol, "Gros" text, buttons)
VendGros Dark:    #0B4D26  (Secondary - "Vend" text, dark sections)
VendGros Orange:  #F5841F  (Accent - CTAs, featured badges, promotions)
VendGros Beige:   #FAF1E5  (Background - hero, cards)
```

### Tailwind Mapping
```
Primary Green:    bg-[#0DAE09] or custom: bg-vendgros-green
Primary Hover:    bg-[#0B9507] or custom: hover:bg-vendgros-green-600
Primary Dark:     bg-[#0B4D26] or custom: bg-vendgros-dark
Primary Light:    bg-[#E8F8E8] or custom: bg-vendgros-green-50
Accent Orange:    bg-[#F5841F] or custom: bg-vendgros-orange
Beige Background: bg-[#FAF1E5] or custom: bg-vendgros-beige

Primary Text:     text-[#0DAE09]
Dark Text:        text-[#0B4D26]
```

### UI Colors
```
Background:       bg-white / bg-[#FAF1E5] (beige) / bg-gray-50
Foreground:       text-gray-900
Secondary Text:   text-gray-600
Muted Text:       text-gray-400

Border:           border-gray-200
Border Focus:     ring-[#0DAE09]

Success:          bg-[#E8F8E8] text-[#0B4D26]
Warning:          bg-yellow-100 text-yellow-800
Error:            bg-red-100 text-red-800
Info:             bg-blue-100 text-blue-800
Featured:         bg-[#F5841F] text-white (Orange badge)
```

### Logo Text Colors
```tsx
// Logotype component
<span className="text-[#0B4D26]">Vend</span>
<span className="text-[#0DAE09]">Gros</span>
```

---

## Appendix B: Icon Library

Use Lucide React icons (already available in codebase via shadcn/ui):

```tsx
import {
  Search,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Star,
  ShoppingCart,
  User,
  Menu,
  X,
  Heart,
  Share2,
  Filter,
  Grid,
  Map,
  Clock,
  Shield,
  Check,
  AlertCircle,
} from 'lucide-react';
```

---

## 9. Animation & Interaction Specifications

### 9.1 Transition Defaults

```css
/* Base transition for all interactive elements */
--transition-fast: 150ms ease-out;
--transition-normal: 200ms ease-out;
--transition-slow: 300ms ease-out;

/* Spring-like transitions for playful elements */
--transition-bounce: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 9.2 Hero Slider Animations

| Transition Type | Duration | Easing | Description |
|-----------------|----------|--------|-------------|
| Slide Change | 500ms | ease-in-out | Cross-fade between slides |
| Auto-advance | 5000ms | - | Time between auto-slides |
| Indicator | 200ms | ease-out | Dot fill animation |
| Arrow Hover | 150ms | ease-out | Scale to 1.1 |

```tsx
// Embla Carousel configuration
const options: EmblaOptionsType = {
  loop: true,
  duration: 30, // Slower transition
  align: 'center',
};

// Autoplay plugin
const autoplayOptions = {
  delay: 5000,
  stopOnInteraction: true,
  stopOnMouseEnter: true,
};
```

### 9.3 Card Hover Effects

**Listing Card**
```css
.listing-card {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}

.listing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.15);
}

.listing-card:active {
  transform: translateY(-2px);
}
```

**Category Card**
```css
.category-card {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}

.category-card:hover {
  transform: scale(1.02);
}

.category-card:hover .overlay {
  opacity: 0.4; /* Lighter on hover */
}

.category-card:hover .category-title {
  transform: translateY(-2px);
}
```

### 9.4 Button States

```css
/* Primary Button */
.btn-primary {
  transition: background-color 150ms ease-out, transform 100ms ease-out;
}

.btn-primary:hover {
  background-color: var(--green-700);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:focus-visible {
  outline: 2px solid var(--green-500);
  outline-offset: 2px;
}
```

### 9.5 Loading States

**Skeleton Loading**
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-200) 0%,
    var(--gray-100) 50%,
    var(--gray-200) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

**Spinner**
```tsx
<div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full" />
```

### 9.6 Scroll Animations

```tsx
// Use Intersection Observer for fade-in sections
const useFadeInOnScroll = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

// CSS classes for animations
.fade-in-up {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 600ms ease-out, transform 600ms ease-out;
}

.fade-in-up.visible {
  opacity: 1;
  transform: translateY(0);
}
```

---

## 10. Image & Asset Requirements

### 10.1 Hero Slider Illustrations

| Asset | Dimensions | Format | Description |
|-------|------------|--------|-------------|
| hero-map.svg | 400x300 | SVG | Map with location pins |
| hero-payment.svg | 400x300 | SVG | Credit card with checkmark |
| hero-qr.svg | 400x300 | SVG | Phone scanning QR code |
| hero-ratings.svg | 400x300 | SVG | Star ratings visualization |

**Style Guidelines:**
- Flat illustration style
- Primary colors: Green-500, Green-600
- Accent: Gray-200, Gray-400
- No shadows in illustrations
- Simple, clean lines

### 10.2 Category Background Images

| Category | Filename | Suggested Content |
|----------|----------|-------------------|
| Groceries | groceries.jpg | Fresh produce, colorful vegetables |
| Clothing | clothing.jpg | Folded clothes, organized wardrobe |
| Electronics | electronics.jpg | Clean gadgets on white background |
| Home & Garden | home.jpg | Modern home interior or garden |
| Toys & Games | toys.jpg | Colorful toys, board games |
| Sports | sports.jpg | Sports equipment, active scene |
| Books & Media | books.jpg | Book stacks, cozy reading |
| Other | other.jpg | Diverse items, boxes |

**Specifications:**
- Dimensions: 800x800px (square, will be cropped)
- Format: WebP with JPEG fallback
- File size: < 100KB each
- Style: High-quality stock photography
- Treatment: Slightly desaturated for overlay compatibility

### 10.3 Placeholder Images

```tsx
// Default listing placeholder
const LISTING_PLACEHOLDER = '/images/placeholder-listing.svg';

// Default avatar placeholder
const AVATAR_PLACEHOLDER = '/images/placeholder-avatar.svg';

// Category fallback
const CATEGORY_PLACEHOLDER = '/images/placeholder-category.svg';
```

### 10.4 Logo Variants

Based on the official VendGros logo design by Christetian NGOUMESSI:

| Variant | Filename | Usage | Background |
|---------|----------|-------|------------|
| Full Logo (Primary) | logo-full.svg | Header, about page | Light/Beige (#FAF1E5) |
| Full Logo (Dark BG) | logo-full-dark.svg | Dark sections | Dark green (#0B4D26) |
| Symbol Only (Green) | logo-icon.svg | Favicon, mobile, app icon | Light backgrounds |
| Symbol Only (Dark) | logo-icon-dark.svg | On green backgrounds | VendGros Green (#0DAE09) |
| Symbol Only (Outline) | logo-icon-outline.svg | Watermarks, subtle branding | Any |
| Full + Tagline | logo-tagline.svg | Marketing materials | Light backgrounds |

**Logo Symbol Description:**
The logo symbol consists of isometric 3D cubes/boxes arranged to represent bulk packaging and wholesale commerce. The geometric design conveys:
- **Multiple boxes**: Bulk quantities
- **3D perspective**: Modern, professional
- **Green color**: Fresh, eco-friendly, growth

**Logotype Colors:**
- "Vend" → Dark Green (#0B4D26)
- "Gros" → Bright Green (#0DAE09)
- Font: Gilroy Bold

**App Icon Specifications:**
| Platform | Size | Format |
|----------|------|--------|
| iOS | 1024x1024 | PNG |
| Android | 512x512 | PNG |
| Favicon | 32x32, 16x16 | ICO/PNG |
| Apple Touch | 180x180 | PNG |

**Logo Clear Space:**
Minimum clear space around the logo = height of the cube symbol on all sides.

### 10.5 Social Share Images

| Platform | Dimensions | Filename |
|----------|------------|----------|
| Open Graph | 1200x630 | og-image.jpg |
| Twitter | 1200x600 | twitter-image.jpg |
| LinkedIn | 1200x627 | linkedin-image.jpg |

---

## 11. Trust Signals & Social Proof

### 11.1 Trust Badges Section

Place between Featured Listings and Categories:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│     ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│     │   🔒    │    │   ⭐    │    │   🛡️    │    │   📱    │   │
│     │ Secure  │    │  4.8    │    │ Verified│    │  24/7   │   │
│     │Payments │    │ Rating  │    │ Sellers │    │ Support │   │
│     │         │    │         │    │         │    │         │   │
│     │ Stripe  │    │ 10,000+ │    │  ID     │    │ Help    │   │
│     │Protected│    │ Reviews │    │ Checked │    │ Center  │   │
│     └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Statistics Bar

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│    1,000+              50,000+              $500K+              │
│    Active              Items                Saved by            │
│    Sellers             Listed               Buyers              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Implementation:
```tsx
const stats = [
  { value: '1,000+', label: 'Active Sellers' },
  { value: '50,000+', label: 'Items Listed' },
  { value: '$500K+', label: 'Saved by Buyers' },
];
```

### 11.3 Testimonial Carousel (Optional)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  What Our Users Say                                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  "I saved 40% on bulk groceries for my restaurant.      │   │
│  │   The QR pickup system makes everything so easy!"        │   │
│  │                                                          │   │
│  │                            — Marie D., Restaurant Owner  │   │
│  │                               ⭐⭐⭐⭐⭐                  │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│                         ○ ● ○                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Mobile-First Wireframes

### 12.1 Mobile Home Page (375px)

```
┌─────────────────────┐
│ 🟢 VendGros      ≡ │  ← Sticky navbar
├─────────────────────┤
│                     │
│ ┌─────────────────┐ │
│ │                 │ │
│ │   [HERO SLIDE]  │ │  ← Full width, 60vh
│ │                 │ │
│ │    📍 FIND      │ │
│ │  LOCAL DEALS    │ │
│ │                 │ │
│ │ [Browse Now →]  │ │
│ │                 │ │
│ │      ● ○ ○ ○    │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ 🔍 Postal Code  │ │  ← Stacked inputs
│ ├─────────────────┤ │
│ │ All Categories ▼│ │
│ ├─────────────────┤ │
│ │ [   Search    ] │ │
│ │                 │ │
│ │ 📍 Use location │ │
│ └─────────────────┘ │
│                     │
│ Featured Deals      │
│ ────────────────    │
│ ┌───────┬───────┐   │  ← 2 columns
│ │ Card  │ Card  │   │
│ ├───────┼───────┤   │
│ │ Card  │ Card  │   │
│ └───────┴───────┘   │
│                     │
│ Categories          │
│ ────────────────    │
│ ┌───────┬───────┐   │
│ │Grocer │Clothe │   │
│ ├───────┼───────┤   │
│ │Electr │ Home  │   │
│ ├───────┼───────┤   │
│ │ Toys  │Sports │   │
│ ├───────┼───────┤   │
│ │ Books │ Other │   │
│ └───────┴───────┘   │
│                     │
│ Latest Listings     │
│ ────────────────    │
│ ┌───────┬───────┐   │
│ │ Card  │ Card  │   │
│ ├───────┼───────┤   │
│ │ Card  │ Card  │   │
│ └───────┴───────┘   │
│ [View All →]        │
│                     │
├─────────────────────┤
│      FOOTER         │
│                     │
│ 🟢 VendGros        │
│ Canada's marketplace│
│                     │
│ Company             │
│ · About · Careers   │
│                     │
│ Support             │
│ · Help · Contact    │
│                     │
│ Legal               │
│ · Privacy · Terms   │
│                     │
│ ─────────────────── │
│ © 2026 VendGros    │
└─────────────────────┘
```

### 12.2 Mobile Navigation (Expanded)

```
┌─────────────────────┐
│ 🟢 VendGros      ✕ │
├─────────────────────┤
│                     │
│  Search Listings    │
│  ─────────────────  │
│  Create Listing     │
│  ─────────────────  │
│  My Dashboard       │
│  ─────────────────  │
│  Chats         (3)  │
│  ─────────────────  │
│                     │
│  ┌───────────────┐  │
│  │   Sign In     │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │   Sign Up     │  │
│  └───────────────┘  │
│                     │
└─────────────────────┘
```

### 12.3 Tablet Home Page (768px)

```
┌───────────────────────────────────────┐
│ 🟢 VendGros    Search  Create   👤 ▼ │
├───────────────────────────────────────┤
│                                       │
│ ┌───────────────────────────────────┐ │
│ │                                   │ │
│ │         [HERO SLIDER]             │ │
│ │                                   │ │
│ │         📍 FIND LOCAL             │ │
│ │           BULK DEALS              │ │
│ │                                   │ │
│ │        [Browse Listings →]        │ │
│ │                                   │ │
│ │            ● ○ ○ ○                │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ 🔍 Postal Code │ Category ▼│Search│ │
│ │                                   │ │
│ │         📍 Use my location        │ │
│ └───────────────────────────────────┘ │
│                                       │
│ Featured Deals              [See All] │
│ ─────────────────────────────────     │
│ ┌─────────┬─────────┬─────────┐       │
│ │  Card   │  Card   │  Card   │       │  ← 3 columns
│ ├─────────┼─────────┼─────────┤       │
│ │  Card   │  Card   │  Card   │       │
│ └─────────┴─────────┴─────────┘       │
│                                       │
│ Browse by Category                    │
│ ─────────────────────────────────     │
│ ┌───────┬───────┬───────┬───────┐     │
│ │Grocer │Clothe │Electr │ Home  │     │
│ ├───────┼───────┼───────┼───────┤     │
│ │ Toys  │Sports │ Books │ Other │     │
│ └───────┴───────┴───────┴───────┘     │
│                                       │
│ Latest Listings             [View All]│
│ ─────────────────────────────────     │
│ ┌─────────┬─────────┬─────────┐       │
│ │  Card   │  Card   │  Card   │       │
│ ├─────────┼─────────┼─────────┤       │
│ │  Card   │  Card   │  Card   │       │
│ └─────────┴─────────┴─────────┘       │
│                                       │
├───────────────────────────────────────┤
│              FOOTER                   │
│  🟢 VendGros                         │
│                                       │
│  Company    Support    Legal    Social│
│  About      Help       Privacy  FB    │
│  Careers    Contact    Terms    IG    │
│                                       │
│  © 2026 VendGros Inc.         🇨🇦    │
└───────────────────────────────────────┘
```

---

## 13. Dark Mode Considerations

### 13.1 Color Adjustments

```css
/* Dark mode overrides */
:root[data-theme="dark"] {
  --background: oklch(0.10 0 0);
  --foreground: oklch(0.95 0 0);

  /* Cards get slightly lighter background */
  --card-bg: oklch(0.15 0 0);

  /* Borders get subtle visibility */
  --border: oklch(0.25 0 0);

  /* Green stays vibrant but slightly adjusted */
  --primary: oklch(0.60 0.17 145);
  --primary-hover: oklch(0.55 0.15 145);
}
```

### 13.2 Component Adaptations

| Component | Light Mode | Dark Mode |
|-----------|------------|-----------|
| Navbar | bg-white | bg-gray-900 |
| Cards | bg-white shadow | bg-gray-800 border |
| Search Box | bg-white shadow | bg-gray-800 border |
| Category Overlay | black 50% | black 60% |
| Footer | bg-gray-50 | bg-gray-950 |
| Text Primary | gray-900 | gray-50 |
| Text Secondary | gray-600 | gray-400 |

### 13.3 Image Handling

```tsx
// Adjust image brightness in dark mode
<img
  src={imageUrl}
  className="dark:brightness-90"
  alt={altText}
/>

// Or use CSS
.dark-mode-image {
  filter: brightness(0.9);
}
```

---

## 14. Internationalization (i18n) Keys

### 14.1 Home Page Strings

```json
{
  "home": {
    "hero": {
      "slide1": {
        "title": "Find Local Bulk Deals",
        "description": "Search for bulk items near you using your postal code or current location.",
        "cta": "Browse Listings"
      },
      "slide2": {
        "title": "Secure Your Deal",
        "description": "Reserve items with just 5% deposit. Pay the rest when you pick up.",
        "cta": "How Deposits Work"
      },
      "slide3": {
        "title": "Safe Pickup",
        "description": "Meet the seller, scan the QR code, and complete your transaction safely.",
        "cta": "Learn More"
      },
      "slide4": {
        "title": "Build Your Reputation",
        "description": "Rate buyers and sellers to help build a trusted community.",
        "cta": "Start Selling"
      }
    },
    "search": {
      "title": "Find Bulk Deals Near You",
      "postalCodePlaceholder": "Enter postal code (e.g., M5H 2N2)",
      "allCategories": "All Categories",
      "searchButton": "Search",
      "useLocation": "Use my current location",
      "popularPrefix": "Popular:"
    },
    "featured": {
      "title": "Featured Deals",
      "seeAll": "See All"
    },
    "categories": {
      "title": "Browse by Category",
      "itemsCount": "{count} listings"
    },
    "latest": {
      "title": "Latest Listings",
      "viewAll": "View All Listings"
    }
  }
}
```

### 14.2 Category Names

```json
{
  "categories": {
    "GROCERIES": "Groceries",
    "CLOTHING": "Clothing",
    "ELECTRONICS": "Electronics",
    "HOME_GOODS": "Home & Garden",
    "TOYS": "Toys & Games",
    "SPORTS": "Sports & Outdoors",
    "BOOKS": "Books & Media",
    "OTHER": "Other"
  }
}
```

---

## 15. Implementation Checklist

### 15.1 Phase 1: Foundation (Priority: High)

#### Global Layout
- [ ] Create `components/layout/footer.tsx`
- [ ] Update `components/layout/navbar.tsx` with new design
- [ ] Add skip-to-content link for accessibility
- [ ] Implement sticky navbar behavior
- [ ] Add mobile menu animations

#### Dependencies
- [ ] Install `embla-carousel-react` and `embla-carousel-autoplay`
- [ ] Install `react-masonry-css`
- [ ] Verify Lucide icons are available

#### Constants & Data
- [ ] Create `lib/constants/categories.ts` with category data
- [ ] Create `lib/constants/slides.ts` with hero content

### 15.2 Phase 2: Home Page Components (Priority: High)

#### Hero Slider
- [ ] Create `components/home/hero-slider.tsx`
- [ ] Implement auto-play with pause on hover
- [ ] Add swipe support for mobile
- [ ] Add dot indicators
- [ ] Add arrow navigation (desktop only)
- [ ] Create/source SVG illustrations

#### Search Box
- [ ] Create `components/home/search-box.tsx`
- [ ] Implement postal code formatting
- [ ] Add geolocation button
- [ ] Connect to existing search API
- [ ] Add popular categories quick links

#### Featured Listings
- [ ] Create `components/home/featured-listings.tsx`
- [ ] Implement masonry grid layout
- [ ] Create `components/home/featured-card.tsx`
- [ ] Add "FEATURED" badge overlay
- [ ] Create tRPC endpoint `listing.getFeatured`

#### Category Grid
- [ ] Create `components/home/category-grid.tsx`
- [ ] Create `components/home/category-card.tsx`
- [ ] Source category background images
- [ ] Create tRPC endpoint `listing.getCategoryCounts`
- [ ] Add hover animations

#### Latest Listings
- [ ] Create `components/home/latest-listings.tsx`
- [ ] Reuse existing `ListingCard` component
- [ ] Create tRPC endpoint `listing.getLatest`
- [ ] Add "View All" link

### 15.3 Phase 3: Polish (Priority: Medium)

#### Animations
- [ ] Add scroll-triggered fade-in animations
- [ ] Implement skeleton loading states
- [ ] Add card hover effects
- [ ] Test all transitions on mobile

#### Trust Signals
- [ ] Create `components/home/trust-badges.tsx`
- [ ] Create `components/home/stats-bar.tsx`
- [ ] Source/create badge icons

#### Dark Mode
- [ ] Test all components in dark mode
- [ ] Adjust image brightness if needed
- [ ] Verify color contrast ratios

#### Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Test keyboard navigation
- [ ] Verify screen reader compatibility
- [ ] Check color contrast (4.5:1 minimum)

### 15.4 Phase 4: Optimization (Priority: Medium)

#### Performance
- [ ] Implement image lazy loading
- [ ] Add blur placeholders for images
- [ ] Optimize LCP (hero image)
- [ ] Minimize CLS (reserve space for images)
- [ ] Run Lighthouse audit (target: >90)

#### SEO
- [ ] Add structured data (JSON-LD)
- [ ] Create OG images
- [ ] Verify meta tags
- [ ] Submit sitemap

---

## 16. Ready-to-Use Component Templates

### 16.1 Hero Slider Component

```tsx
// components/home/hero-slider.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    id: 1,
    icon: "📍",
    title: "Find Local Bulk Deals",
    description: "Search for bulk items near you using your postal code or current location.",
    cta: { label: "Browse Listings", href: "/listings/search" },
    bgGradient: "from-green-50 to-white",
  },
  {
    id: 2,
    icon: "💳",
    title: "Secure Your Deal",
    description: "Reserve items with just 5% deposit. Pay the rest when you pick up.",
    cta: { label: "How It Works", href: "/how-it-works" },
    bgGradient: "from-green-100 to-green-50",
  },
  {
    id: 3,
    icon: "📱",
    title: "Safe Pickup",
    description: "Meet the seller, scan the QR code, and complete your transaction safely.",
    cta: { label: "Learn More", href: "/how-it-works#pickup" },
    bgGradient: "from-white to-green-50",
  },
  {
    id: 4,
    icon: "⭐",
    title: "Build Your Reputation",
    description: "Rate buyers and sellers to help build a trusted community.",
    cta: { label: "Start Selling", href: "/listings/create" },
    bgGradient: "from-green-50 to-white",
  },
];

export function HeroSlider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  return (
    <section className="relative w-full overflow-hidden">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={`min-w-full flex-shrink-0 bg-gradient-to-b ${slide.bgGradient}`}
            >
              <div className="mx-auto max-w-4xl px-4 py-16 text-center md:py-24 lg:py-32">
                <span className="mb-4 inline-block text-6xl">{slide.icon}</span>
                <h2 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl lg:text-5xl">
                  {slide.title}
                </h2>
                <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 md:text-xl">
                  {slide.description}
                </p>
                <Link
                  href={slide.cta.href}
                  className="inline-flex items-center rounded-lg bg-[#0DAE09] px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-[#0B9507]"
                >
                  {slide.cta.label}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows (Desktop) */}
      <button
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg transition-transform hover:scale-110 md:block"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6 text-gray-800" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg transition-transform hover:scale-110 md:block"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6 text-gray-800" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`h-3 w-3 rounded-full transition-colors ${
              index === selectedIndex ? "bg-[#0DAE09]" : "bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
```

### 16.2 Search Box Component

```tsx
// components/home/search-box.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "GROCERIES", label: "Groceries" },
  { value: "CLOTHING", label: "Clothing" },
  { value: "ELECTRONICS", label: "Electronics" },
  { value: "HOME_GOODS", label: "Home & Garden" },
  { value: "TOYS", label: "Toys & Games" },
  { value: "SPORTS", label: "Sports & Outdoors" },
  { value: "BOOKS", label: "Books & Media" },
  { value: "OTHER", label: "Other" },
];

const POPULAR_CATEGORIES = ["Groceries", "Electronics", "Clothing"];

export function SearchBox() {
  const router = useRouter();
  const [postalCode, setPostalCode] = useState("");
  const [category, setCategory] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const formatPostalCode = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const limited = cleaned.slice(0, 6);
    if (limited.length > 3) {
      return `${limited.slice(0, 3)} ${limited.slice(3)}`;
    }
    return limited;
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (postalCode) params.set("postalCode", postalCode);
    if (category) params.set("category", category);
    router.push(`/listings/search?${params.toString()}`);
  };

  const handleUseLocation = () => {
    if (!("geolocation" in navigator)) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        router.push(`/listings/search?lat=${latitude}&lng=${longitude}${category ? `&category=${category}` : ""}`);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  };

  return (
    <section className="relative z-10 mx-auto -mt-8 max-w-3xl px-4">
      <div className="rounded-2xl bg-white p-6 shadow-xl md:p-8">
        <h2 className="mb-6 text-center text-xl font-semibold text-gray-900 md:text-2xl">
          Find Bulk Deals Near You
        </h2>

        <div className="flex flex-col gap-3 md:flex-row">
          {/* Postal Code Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(formatPostalCode(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter postal code (e.g., M5H 2N2)"
              maxLength={7}
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0DAE09]"
            />
          </div>

          {/* Category Select */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0DAE09] md:w-48"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={!postalCode}
            className="rounded-lg bg-[#0DAE09] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#0B9507] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Search
          </button>
        </div>

        {/* Use Location Button */}
        <button
          onClick={handleUseLocation}
          disabled={isLocating}
          className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-[#0DAE09] hover:text-[#0B9507] md:w-auto"
        >
          <MapPin className="h-4 w-4" />
          {isLocating ? "Getting location..." : "Use my current location"}
        </button>

        {/* Popular Categories */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500">
          <span>Popular:</span>
          {POPULAR_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(CATEGORIES.find((c) => c.label === cat)?.value || "");
              }}
              className="text-[#0DAE09] hover:underline"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 16.3 Category Grid Component

```tsx
// components/home/category-grid.tsx
"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

const CATEGORIES = [
  { id: "GROCERIES", name: "Groceries", icon: "🥬", image: "/categories/groceries.jpg" },
  { id: "CLOTHING", name: "Clothing", icon: "👕", image: "/categories/clothing.jpg" },
  { id: "ELECTRONICS", name: "Electronics", icon: "📱", image: "/categories/electronics.jpg" },
  { id: "HOME_GOODS", name: "Home & Garden", icon: "🏠", image: "/categories/home.jpg" },
  { id: "TOYS", name: "Toys & Games", icon: "🎮", image: "/categories/toys.jpg" },
  { id: "SPORTS", name: "Sports & Outdoors", icon: "⚽", image: "/categories/sports.jpg" },
  { id: "BOOKS", name: "Books & Media", icon: "📚", image: "/categories/books.jpg" },
  { id: "OTHER", name: "Other", icon: "📦", image: "/categories/other.jpg" },
];

export function CategoryGrid() {
  const { data: counts } = api.listing.getCategoryCounts.useQuery();

  const getCount = (categoryId: string) => {
    return counts?.find((c) => c.category === categoryId)?.count ?? 0;
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <h2 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">
        Browse by Category
      </h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((category) => (
          <Link
            key={category.id}
            href={`/listings/search?category=${category.id}`}
            className="group relative aspect-square overflow-hidden rounded-xl"
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundImage: `url(${category.image})` }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent transition-opacity group-hover:from-black/60" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-end p-4 text-white">
              <span className="mb-1 text-3xl">{category.icon}</span>
              <h3 className="text-lg font-semibold">{category.name}</h3>
              <p className="text-sm text-gray-200">
                {getCount(category.id)} listings
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

### 16.4 Featured Listings (Masonry) Component

```tsx
// components/home/featured-listings.tsx
"use client";

import Link from "next/link";
import Masonry from "react-masonry-css";
import { api } from "~/trpc/react";
import { ChevronRight } from "lucide-react";

const breakpointColumns = {
  default: 4,
  1280: 4,
  1024: 3,
  768: 2,
  640: 2,
};

export function FeaturedListings() {
  const { data: listings, isLoading } = api.listing.getFeatured.useQuery({ limit: 8 });

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="mb-8 flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </section>
    );
  }

  if (!listings?.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Featured Deals
        </h2>
        <Link
          href="/listings/search?featured=true"
          className="flex items-center gap-1 font-medium text-[#0DAE09] hover:text-[#0B9507]"
        >
          See All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <Masonry
        breakpointCols={breakpointColumns}
        className="flex -ml-4 w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {listings.map((listing, index) => (
          <Link
            key={listing.id}
            href={`/listings/${listing.id}`}
            className="group mb-4 block overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-xl"
          >
            {/* Image with variable height for masonry effect */}
            <div
              className="relative bg-gray-200"
              style={{ aspectRatio: index % 3 === 0 ? "3/4" : "4/3" }}
            >
              {listing.photos[0] ? (
                <img
                  src={listing.photos[0]}
                  alt={listing.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  No image
                </div>
              )}

              {/* Featured Badge */}
              <span className="absolute left-2 top-2 rounded bg-yellow-400 px-2 py-1 text-xs font-bold text-yellow-900">
                FEATURED
              </span>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="mb-1 line-clamp-2 font-semibold text-gray-900">
                {listing.title}
              </h3>
              <p className="text-lg font-bold text-[#0DAE09]">
                ${listing.pricePerPiece.toFixed(2)}
                <span className="text-sm font-normal text-gray-500">/piece</span>
              </p>
              {listing.seller.ratingAverage && (
                <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                  <span>⭐</span>
                  <span>{listing.seller.ratingAverage.toFixed(1)}</span>
                  {listing.seller.verificationBadge !== "NONE" && (
                    <span className="ml-1 text-[#0DAE09]">✓ Verified</span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </Masonry>
    </section>
  );
}
```

### 16.5 Footer Component

```tsx
// components/layout/footer.tsx
import Link from "next/link";

const footerLinks = {
  company: [
    { label: "About Us", href: "/about" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Careers", href: "/careers" },
  ],
  support: [
    { label: "Help Center", href: "/help" },
    { label: "Contact Us", href: "/contact" },
    { label: "Safety Tips", href: "/safety" },
    { label: "FAQ", href: "/faq" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

const socialLinks = [
  { label: "Facebook", href: "https://facebook.com/vendgros", icon: "FB" },
  { label: "Twitter", href: "https://twitter.com/vendgros", icon: "X" },
  { label: "Instagram", href: "https://instagram.com/vendgros", icon: "IG" },
  { label: "LinkedIn", href: "https://linkedin.com/company/vendgros", icon: "LI" },
];

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand - Using official logo colors */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <img src="/logo-icon.svg" alt="" className="h-8 w-8" aria-hidden="true" />
              <span className="font-gilroy text-2xl font-bold">
                <span className="text-[#0B4D26] dark:text-[#0DAE09]">Vend</span>
                <span className="text-[#0DAE09]">Gros</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-gray-600 dark:text-gray-400">
              Canada's community marketplace for bulk deals. Find amazing savings on bulk purchases near you.
            </p>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Support</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between border-t border-gray-200 pt-8 dark:border-gray-800 md:flex-row">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} VendGros Inc. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="mt-4 flex items-center gap-4 md:mt-0">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
            <span className="ml-2 text-sm text-gray-500">🇨🇦 Canada</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

## 17. API Endpoints Implementation

### 17.1 Required tRPC Procedures

```typescript
// packages/api/src/router/listing.ts

// Add these procedures to the existing listing router

// Get featured listings (top-rated or manually curated)
getFeatured: publicProcedure
  .input(z.object({ limit: z.number().min(1).max(20).default(8) }))
  .query(async ({ ctx, input }) => {
    return ctx.db.query.listing.findMany({
      where: and(
        eq(listing.status, "PUBLISHED"),
        eq(listing.isActive, true)
      ),
      orderBy: [desc(listing.viewCount), desc(listing.createdAt)],
      limit: input.limit,
      with: {
        seller: {
          columns: {
            sellerRatingAverage: true,
            sellerRatingCount: true,
            verificationBadge: true,
          },
        },
      },
    });
  }),

// Get latest listings
getLatest: publicProcedure
  .input(z.object({ limit: z.number().min(1).max(20).default(8) }))
  .query(async ({ ctx, input }) => {
    return ctx.db.query.listing.findMany({
      where: and(
        eq(listing.status, "PUBLISHED"),
        eq(listing.isActive, true)
      ),
      orderBy: desc(listing.publishedAt),
      limit: input.limit,
      with: {
        seller: {
          columns: {
            sellerRatingAverage: true,
            sellerRatingCount: true,
          },
        },
      },
    });
  }),

// Get category counts
getCategoryCounts: publicProcedure
  .query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        category: listing.category,
        count: sql<number>`count(*)::int`,
      })
      .from(listing)
      .where(and(
        eq(listing.status, "PUBLISHED"),
        eq(listing.isActive, true)
      ))
      .groupBy(listing.category);

    return result;
  }),
```

---

## 18. Conversion Optimization Guidelines

### 18.1 CTA Hierarchy

| Priority | Element | Color | Size |
|----------|---------|-------|------|
| Primary | "Browse Listings" | green-600 | Large (py-4 px-8) |
| Secondary | "Post a Listing" | Outline green | Large |
| Tertiary | "View All" links | Text green | Medium |

### 18.2 Above-the-Fold Content

**Must be visible without scrolling:**
1. Logo and navigation
2. First hero slide with primary CTA
3. Search box (partially visible on mobile)

### 18.3 Trust Indicators Placement

- **Header**: Verification badge for logged-in verified users
- **Hero**: "Join 1,000+ sellers" social proof
- **Search Box**: "Secure payments with Stripe"
- **Featured Section**: Seller ratings and badges
- **Footer**: Security badges, company info

### 18.4 Mobile Optimization

- Touch targets: minimum 44x44px
- Thumb-friendly CTA placement (bottom of screen)
- Sticky "Post Listing" button on scroll
- Swipe gestures for carousel

---

## 19. Complete Home Page Implementation

### 19.1 Updated `app/page.tsx`

```tsx
// apps/nextjs/src/app/page.tsx
import { Suspense } from "react";
import { HeroSlider } from "~/components/home/hero-slider";
import { SearchBox } from "~/components/home/search-box";
import { FeaturedListings } from "~/components/home/featured-listings";
import { CategoryGrid } from "~/components/home/category-grid";
import { LatestListings } from "~/components/home/latest-listings";
import { TrustBadges } from "~/components/home/trust-badges";

// Loading skeletons
function HeroSkeleton() {
  return <div className="h-[400px] animate-pulse bg-gray-100 md:h-[500px]" />;
}

function SectionSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Slider - How VendGros Works */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSlider />
      </Suspense>

      {/* Search Box - Overlapping hero */}
      <SearchBox />

      {/* Trust Badges */}
      <TrustBadges />

      {/* Featured Listings - Masonry Grid */}
      <Suspense fallback={<SectionSkeleton />}>
        <FeaturedListings />
      </Suspense>

      {/* Browse by Category */}
      <Suspense fallback={<SectionSkeleton />}>
        <CategoryGrid />
      </Suspense>

      {/* Latest Listings */}
      <Suspense fallback={<SectionSkeleton />}>
        <LatestListings />
      </Suspense>
    </div>
  );
}
```

### 19.2 Latest Listings Component

```tsx
// components/home/latest-listings.tsx
"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { ChevronRight } from "lucide-react";

export function LatestListings() {
  const { data: listings, isLoading } = api.listing.getLatest.useQuery({ limit: 8 });

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </section>
    );
  }

  if (!listings?.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl">
          Latest Listings
        </h2>
        <Link
          href="/listings/search"
          className="flex items-center gap-1 font-medium text-[#0DAE09] hover:text-[#0B9507]"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {listings.map((listing) => (
          <Link
            key={listing.id}
            href={`/listings/${listing.id}`}
            className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {/* Image */}
            <div className="aspect-video bg-gray-200 dark:bg-gray-700">
              {listing.photos[0] ? (
                <img
                  src={listing.photos[0]}
                  alt={listing.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-3 md:p-4">
              <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100 md:text-base">
                {listing.title}
              </h3>
              <p className="text-base font-bold text-[#0DAE09] md:text-lg">
                ${listing.pricePerPiece.toFixed(2)}
                <span className="text-xs font-normal text-gray-500 md:text-sm">/piece</span>
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 md:text-sm">
                <span>{listing.quantityAvailable} available</span>
              </div>
              {listing.seller.sellerRatingAverage && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <span>⭐</span>
                  <span>{listing.seller.sellerRatingAverage.toFixed(1)}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

### 19.3 Trust Badges Component

```tsx
// components/home/trust-badges.tsx
import { Shield, Star, CheckCircle, Headphones } from "lucide-react";

const badges = [
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Stripe Protected",
  },
  {
    icon: Star,
    title: "4.8 Rating",
    description: "10,000+ Reviews",
  },
  {
    icon: CheckCircle,
    title: "Verified Sellers",
    description: "ID Checked",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Help Center",
  },
];

export function TrustBadges() {
  return (
    <section className="border-y border-gray-100 bg-gray-50 py-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
          {badges.map((badge) => (
            <div key={badge.title} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <badge.icon className="h-5 w-5 text-[#0DAE09] dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {badge.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {badge.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### 19.4 Updated Layout with Footer

```tsx
// apps/nextjs/src/app/layout.tsx (updated)
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@acme/ui";
import { ThemeProvider, ThemeToggle } from "@acme/ui/theme";
import { Toaster } from "@acme/ui/toast";

import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";
import { Navbar } from "~/components/layout/navbar";
import { Footer } from "~/components/layout/footer";

import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    env.VERCEL_ENV === "production"
      ? "https://vendgros.com"
      : "http://localhost:3000",
  ),
  title: "VendGros - Buy and Sell Bulk Items Locally in Canada",
  description: "Find amazing deals on bulk purchases near you. VendGros connects buyers and sellers for local bulk transactions with secure 5% deposit system.",
  keywords: ["bulk deals", "wholesale", "local marketplace", "Canada", "buy in bulk"],
  openGraph: {
    title: "VendGros - Canada's Bulk Marketplace",
    description: "Find amazing deals on bulk purchases near you.",
    url: "https://vendgros.com",
    siteName: "VendGros",
    images: ["/og-image.jpg"],
    type: "website",
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: "VendGros - Buy and Sell Bulk Items Locally",
    description: "Find amazing deals on bulk purchases near you.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <TRPCReactProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{props.children}</main>
              <Footer />
            </div>
          </TRPCReactProvider>
          <div className="fixed right-4 bottom-4 z-50">
            <ThemeToggle />
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 20. Design Tokens (TypeScript)

Create this file for consistent styling across components:

```typescript
// apps/nextjs/src/lib/design-tokens.ts

/**
 * VendGros Brand Colors
 * Based on official logo design by Christetian NGOUMESSI
 */
export const brandColors = {
  // Primary brand green (logo symbol, "Gros" text, primary buttons)
  vendgrosGreen: "#0DAE09",
  // Secondary dark green ("Vend" text, dark backgrounds)
  vendgrosDark: "#0B4D26",
  // Accent orange (CTAs, highlights, promotions)
  vendgrosOrange: "#F5841F",
  // Background beige (hero sections, card backgrounds)
  vendgrosBeige: "#FAF1E5",
} as const;

export const colors = {
  primary: {
    50: "#E8F8E8",   // Light tint
    100: "#C6F0C5",
    200: "#9DE59B",
    300: "#74DA71",
    400: "#4BCF47",
    500: "#0DAE09",  // VendGros Green (brand primary)
    600: "#0B9507",  // Hover state
    700: "#097C06",
    800: "#076305",
    900: "#0B4D26",  // VendGros Dark
  },
  accent: {
    orange: "#F5841F",  // VendGros Orange
    orangeLight: "#FEF3E8",
    orangeDark: "#D46A0C",
  },
  beige: {
    50: "#FEFCF9",
    100: "#FAF1E5",   // VendGros Beige
    200: "#F5E6D3",
  },
  gray: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#e5e5e5",
    300: "#d4d4d4",
    400: "#a3a3a3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
    950: "#0a0a0a",
  },
} as const;

export const spacing = {
  section: {
    paddingY: "py-12 md:py-16",
    paddingX: "px-4 md:px-8",
  },
  container: "mx-auto max-w-7xl",
  card: "p-4 md:p-6",
} as const;

export const typography = {
  h1: "text-3xl md:text-4xl lg:text-5xl font-bold",
  h2: "text-2xl md:text-3xl font-bold",
  h3: "text-lg md:text-xl font-semibold",
  body: "text-sm md:text-base",
  small: "text-xs md:text-sm",
} as const;

export const animation = {
  transition: {
    fast: "transition-all duration-150 ease-out",
    normal: "transition-all duration-200 ease-out",
    slow: "transition-all duration-300 ease-out",
  },
  hover: {
    lift: "hover:-translate-y-1 hover:shadow-lg",
    scale: "hover:scale-102",
    glow: "hover:ring-2 hover:ring-green-500/20",
  },
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// Grid configurations for different sections
export const grid = {
  listings: "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
  categories: "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
  features: "grid grid-cols-1 gap-6 md:grid-cols-3",
} as const;

// Component-specific tokens (using VendGros brand colors)
export const components = {
  card: {
    base: "rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
    hover: "transition-shadow hover:shadow-lg",
    image: "aspect-video bg-gray-200 dark:bg-gray-700",
  },
  button: {
    // VendGros Green: #0DAE09
    primary: "bg-[#0DAE09] hover:bg-[#0B9507] text-white font-semibold rounded-lg transition-colors",
    secondary: "border-2 border-[#0DAE09] text-[#0DAE09] hover:bg-[#E8F8E8] font-semibold rounded-lg transition-colors",
    // VendGros Orange: #F5841F (for featured/promotional CTAs)
    accent: "bg-[#F5841F] hover:bg-[#D46A0C] text-white font-semibold rounded-lg transition-colors",
    ghost: "text-[#0DAE09] hover:text-[#0B4D26] hover:underline font-medium",
    sizes: {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    },
  },
  input: {
    base: "w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0DAE09] focus:border-transparent dark:border-gray-600 dark:bg-gray-800",
  },
  badge: {
    category: "inline-block px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    // VendGros Orange for featured badges
    featured: "inline-block px-2 py-1 text-xs font-bold rounded bg-[#F5841F] text-white",
    status: "inline-block px-3 py-1 text-xs font-medium rounded-full",
  },
} as const;

// Category definitions
export const categories = [
  { id: "GROCERIES", name: "Groceries", icon: "🥬", slug: "groceries" },
  { id: "CLOTHING", name: "Clothing", icon: "👕", slug: "clothing" },
  { id: "ELECTRONICS", name: "Electronics", icon: "📱", slug: "electronics" },
  { id: "HOME_GOODS", name: "Home & Garden", icon: "🏠", slug: "home-goods" },
  { id: "TOYS", name: "Toys & Games", icon: "🎮", slug: "toys" },
  { id: "SPORTS", name: "Sports & Outdoors", icon: "⚽", slug: "sports" },
  { id: "BOOKS", name: "Books & Media", icon: "📚", slug: "books" },
  { id: "OTHER", name: "Other", icon: "📦", slug: "other" },
] as const;

export type CategoryId = typeof categories[number]["id"];
```

---

## 21. Testing Requirements

### 21.1 Component Tests

```typescript
// __tests__/components/home/hero-slider.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { HeroSlider } from "~/components/home/hero-slider";

describe("HeroSlider", () => {
  it("renders all slides", () => {
    render(<HeroSlider />);
    expect(screen.getByText("Find Local Bulk Deals")).toBeInTheDocument();
  });

  it("has navigation dots", () => {
    render(<HeroSlider />);
    const dots = screen.getAllByRole("button", { name: /Go to slide/i });
    expect(dots).toHaveLength(4);
  });

  it("changes slide on dot click", async () => {
    render(<HeroSlider />);
    const secondDot = screen.getByRole("button", { name: /Go to slide 2/i });
    fireEvent.click(secondDot);
    // Verify slide changed (implementation-specific)
  });
});
```

### 21.2 E2E Tests

```typescript
// e2e/home.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/VendGros/);
  });

  test("hero slider is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-testid='hero-slider']")).toBeVisible();
  });

  test("search box accepts postal code", async ({ page }) => {
    await page.goto("/");
    const input = page.locator("input[placeholder*='postal code']");
    await input.fill("M5H2N2");
    await expect(input).toHaveValue("M5H 2N2");
  });

  test("category cards link to search", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Groceries");
    await expect(page).toHaveURL(/category=GROCERIES/);
  });

  test("featured listings are displayed", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("text=Featured Deals").first();
    await expect(section).toBeVisible();
  });
});
```

### 21.3 Accessibility Tests

```typescript
// __tests__/accessibility/home.test.tsx
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import HomePage from "~/app/page";

expect.extend(toHaveNoViolations);

describe("Home Page Accessibility", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 21.4 Visual Regression Tests

```typescript
// e2e/visual/home.spec.ts
import { test, expect } from "@playwright/test";

test("home page visual regression", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Full page screenshot
  await expect(page).toHaveScreenshot("home-full.png", {
    fullPage: true,
    maxDiffPixelRatio: 0.01,
  });

  // Mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page).toHaveScreenshot("home-mobile.png", {
    fullPage: true,
  });
});
```

---

## Appendix C: Performance Budget

### C.1 Core Web Vitals Targets

| Metric | Target | Maximum | Measurement |
|--------|--------|---------|-------------|
| **LCP** (Largest Contentful Paint) | < 2.0s | 2.5s | Hero slider image |
| **FID** (First Input Delay) | < 50ms | 100ms | Search button click |
| **CLS** (Cumulative Layout Shift) | < 0.05 | 0.1 | Image placeholders |
| **FCP** (First Contentful Paint) | < 1.2s | 1.8s | Navbar + hero text |
| **TTI** (Time to Interactive) | < 2.5s | 3.5s | Full page interactive |
| **TTFB** (Time to First Byte) | < 200ms | 600ms | Server response |

### C.2 Bundle Size Budget

| Bundle | Budget | Warning | Critical |
|--------|--------|---------|----------|
| Initial JS | < 150KB | 180KB | 220KB |
| Initial CSS | < 30KB | 40KB | 50KB |
| Per-route JS | < 50KB | 70KB | 100KB |
| Total images (above fold) | < 200KB | 300KB | 400KB |
| Hero slider images (each) | < 80KB | 100KB | 150KB |
| Category images (each) | < 40KB | 60KB | 80KB |

### C.3 Image Optimization Rules

```typescript
// next.config.ts image configuration
const imageConfig = {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
};

// Recommended image dimensions
const imageSizes = {
  heroSlider: { width: 1920, height: 600 },    // 3.2:1 aspect
  categoryCard: { width: 800, height: 800 },   // 1:1 square
  listingCard: { width: 640, height: 360 },    // 16:9 aspect
  listingThumb: { width: 320, height: 180 },   // 16:9 aspect
  avatar: { width: 128, height: 128 },         // 1:1 square
};
```

### C.4 Lighthouse Score Targets

| Category | Minimum | Target |
|----------|---------|--------|
| Performance | 85 | 95 |
| Accessibility | 95 | 100 |
| Best Practices | 90 | 100 |
| SEO | 95 | 100 |

### C.5 Network Requests Budget

| Request Type | Max Count | Max Total Size |
|--------------|-----------|----------------|
| JavaScript | 10 | 200KB |
| CSS | 3 | 50KB |
| Images (above fold) | 12 | 400KB |
| Fonts | 4 | 100KB |
| API calls (initial) | 5 | 50KB |
| **Total** | **34** | **800KB** |

---

## Appendix D: Pre-Launch Checklist

### D.1 Design Review

- [ ] All sections match design specifications
- [ ] Responsive behavior tested at all breakpoints (375, 640, 768, 1024, 1280, 1536)
- [ ] Dark mode verified for all components
- [ ] Typography hierarchy is consistent
- [ ] Color contrast meets WCAG AA (4.5:1 minimum)
- [ ] Touch targets are 44x44px minimum on mobile
- [ ] Animations are smooth (60fps)
- [ ] Loading states implemented for all async content

### D.2 Content

- [ ] All placeholder text replaced with real content
- [ ] Hero slider copy finalized
- [ ] Category images sourced and optimized
- [ ] Meta descriptions written
- [ ] OG images created (1200x630)
- [ ] Favicon set uploaded (16, 32, 180, 192, 512)
- [ ] 404 page designed and implemented

### D.3 Functionality

- [ ] Search by postal code works correctly
- [ ] Geolocation permission flow tested
- [ ] Category filtering works
- [ ] Featured listings API returns data
- [ ] Latest listings API returns data
- [ ] Category counts API returns data
- [ ] All links point to correct destinations
- [ ] Navigation works on mobile (hamburger menu)
- [ ] Footer links all functional

### D.4 Performance

- [ ] Lighthouse score > 90 on mobile
- [ ] LCP < 2.5s on 3G connection
- [ ] CLS < 0.1 (no layout shifts)
- [ ] Images lazy loaded below fold
- [ ] Hero image preloaded
- [ ] Critical CSS inlined
- [ ] JavaScript code-split by route

### D.5 SEO

- [ ] Title tag optimized (< 60 chars)
- [ ] Meta description (< 160 chars)
- [ ] H1 tag present and unique
- [ ] Image alt texts descriptive
- [ ] Structured data (JSON-LD) implemented
- [ ] Canonical URLs set
- [ ] Sitemap.xml generated
- [ ] Robots.txt configured
- [ ] hreflang tags for multilingual (if applicable)

### D.6 Accessibility

- [ ] Keyboard navigation works throughout
- [ ] Screen reader tested (VoiceOver/NVDA)
- [ ] Focus indicators visible
- [ ] Skip navigation link present
- [ ] ARIA labels on interactive elements
- [ ] Form labels properly associated
- [ ] Error messages announced to screen readers
- [ ] No accessibility violations (axe-core)

### D.7 Cross-Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] iOS Safari (latest 2 versions)
- [ ] Chrome Android (latest)

### D.8 Analytics & Monitoring

- [ ] Google Analytics 4 configured
- [ ] Core Web Vitals monitoring enabled
- [ ] Error tracking (Sentry) configured
- [ ] Uptime monitoring set up
- [ ] Performance budgets in CI/CD

### D.9 Security

- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] X-Frame-Options set
- [ ] No sensitive data in client bundles
- [ ] API rate limiting enabled

### D.10 Final Verification

- [ ] Staging environment matches production config
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] DNS configured correctly
- [ ] SSL certificate valid
- [ ] CDN cache configured
- [ ] Backup system tested

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-20 | Claude | Initial design documentation |
| 1.1 | 2026-01-20 | Claude | Added animations, assets, trust signals, mobile wireframes, dark mode, i18n |
| 1.2 | 2026-01-20 | Claude | Added implementation checklists, component templates, API specs, CTA guidelines |
| 1.3 | 2026-01-20 | Claude | Added quick-start guide, complete home page, design tokens, testing requirements |
| 1.4 | 2026-01-20 | Claude | Added structured TOC, performance budget, pre-launch checklist |
| 1.5 | 2026-01-20 | Claude | **Branding Update**: Integrated official logo design (Christetian NGOUMESSI). Updated colors: VendGros Green (#0DAE09), VendGros Dark (#0B4D26), VendGros Orange (#F5841F), VendGros Beige (#FAF1E5). Added Gilroy font. Updated all component examples with brand colors. |

---

## Summary

This document provides a complete specification for the VendGros public website redesign:

**Scope**: Home page with 5 main sections (Hero Slider, Search Box, Featured Listings, Categories, Latest Listings)

**Brand Identity** (Official Logo by Christetian NGOUMESSI):
- **Logo Symbol**: Isometric 3D cubes representing bulk/wholesale
- **Colors**: VendGros Green (#0DAE09), Dark (#0B4D26), Orange (#F5841F), Beige (#FAF1E5)
- **Typography**: Gilroy (brand), Geist Sans (UI)

**Key Deliverables**:
- 7 ready-to-use React components
- 3 tRPC API endpoints
- Complete design system with brand tokens
- Mobile-first responsive wireframes
- Testing suite templates

**Technical Stack**: Next.js 15, Tailwind CSS v4, shadcn/ui, Embla Carousel, React Masonry, Gilroy Font

**Next Steps**:
1. Follow Quick Start Guide (top of document)
2. Use Implementation Checklist (Section 15)
3. Complete Pre-Launch Checklist (Appendix D)
4. Deploy and monitor performance

---

*This document serves as the design specification for VendGros public-facing pages. Implementation should follow these guidelines while maintaining flexibility for minor adjustments based on technical constraints or user feedback.*
