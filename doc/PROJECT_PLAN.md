# Vendgros - Full Project Implementation Plan

**Version:** 1.0
**Based on:** Vendgros SRS v1.0
**Target:** 4-week MVP
**Stack:** T3 Stack (Next.js 15, React Native/Expo, tRPC, Prisma, PostgreSQL + PostGIS)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Stack Summary](#technical-stack-summary)
3. [Week 1: Foundation](#week-1-foundation)
4. [Week 2: Listings & Search](#week-2-listings--search)
5. [Week 3: Transactions & Engagement](#week-3-transactions--engagement)
6. [Week 4: Launch Preparation](#week-4-launch-preparation)
7. [Post-MVP Roadmap](#post-mvp-roadmap)
8. [Implementation Guidelines](#implementation-guidelines)

---

## Project Overview

### Business Context
Vendgros is a community-driven marketplace connecting local sellers (B2B merchants and C2C individuals) with buyers through a secure 5% deposit reservation system. The platform facilitates in-person pickup transactions with QR code verification.

### Key Differentiators
- Zero subscription fees (5% deposit model)
- Geospatial search (PostGIS)
- QR code verification for pickups
- Bi-directional blind ratings
- Multi-platform (Web + iOS + Android)
- Multi-language (EN/FR/ES)

### Success Metrics
- Page load < 3s
- API response < 500ms
- 99.5% uptime
- Support 100,000+ listings
- WCAG 2.1 Level AA compliance

---

## Technical Stack Summary

### Monorepo Architecture
```
create-t3-turbo/
├── apps/
│   ├── nextjs/          # Web application (Next.js 15)
│   └── expo/            # Mobile apps (iOS + Android)
├── packages/
│   ├── api/             # tRPC API routes
│   ├── auth/            # NextAuth v5 configuration
│   ├── db/              # Prisma schema + client
│   ├── ui/              # Shared UI components
│   ├── validators/      # Zod schemas
│   └── i18n/            # Internationalization
└── tooling/
    ├── eslint/
    ├── prettier/
    └── typescript/
```

### Core Technologies
- **Build:** Turborepo + pnpm
- **Web:** Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui
- **Mobile:** React Native (Expo SDK 52+), NativeWind, React Native Paper
- **API:** tRPC v11
- **Database:** PostgreSQL 16 + PostGIS
- **ORM:** Prisma 6.x
- **Auth:** NextAuth v5 + Twilio (SMS) + Resend (Email)
- **Payments:** Stripe
- **Storage:** DigitalOcean Spaces + Cloudflare CDN
- **Cache/Queue:** Redis + BullMQ
- **Maps:** Mapbox/Leaflet (web), react-native-maps (mobile)
- **State:** TanStack Query + Zustand
- **Hosting:** DigitalOcean App Platform (Toronto)

---

## Week 1: Foundation

### 1.1 Project Bootstrap

**Task 1.1.1: Initialize Monorepo**
```bash
npx create-t3-turbo@latest vendgros-app
cd vendgros-app
pnpm install
```

**Acceptance Criteria:**
- [x] Monorepo structure created
- [x] All packages install successfully
- [x] Dev server runs on both web and mobile
- [x] TypeScript compilation works

**Implementation Notes:**
- Use `create-t3-turbo` starter template
- Configure workspace in `pnpm-workspace.yaml`
- Set up Turborepo pipeline in `turbo.json`

---

### 1.2 Database Setup

**Task 1.2.1: Configure PostgreSQL + PostGIS**

**File:** `packages/db/prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

// Enable PostGIS extension
generator postGIS {
  provider = "prisma-client-js"
  extensions = ["postgis"]
}
```

**File:** `packages/db/prisma/migrations/00_enable_postgis/migration.sql`
```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
```

**Acceptance Criteria:**
- [ ] PostgreSQL 16 connected locally
- [ ] PostGIS extension enabled
- [ ] Prisma client generates successfully
- [ ] Can run migrations

---

**Task 1.2.2: Core Database Schema**

**File:** `packages/db/prisma/schema.prisma`

```prisma
enum UserType {
  BUYER
  SELLER_INDIVIDUAL
  SELLER_MERCHANT
}

enum AccountStatus {
  UNVERIFIED
  ACTIVE
  SUSPENDED
  BANNED
}

model User {
  id                    String        @id @default(cuid())
  email                 String        @unique
  phone                 String        @unique
  passwordHash          String?

  emailVerified         Boolean       @default(false)
  phoneVerified         Boolean       @default(false)
  accountStatus         AccountStatus @default(UNVERIFIED)

  userType              UserType      @default(BUYER)
  languagePreference    String        @default("en") // en, fr, es

  ratingAverage         Float?        @default(0)
  ratingCount           Int           @default(0)

  // Relationships
  listingsAsSeller      Listing[]     @relation("SellerListings")
  reservationsAsBuyer   Reservation[] @relation("BuyerReservations")
  ratingsGiven          Rating[]      @relation("RaterRatings")
  ratingsReceived       Rating[]      @relation("RatedRatings")

  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  @@index([email])
  @@index([phone])
  @@index([accountStatus])
}

enum ListingStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  RESERVED
  COMPLETED
  EXPIRED
  CANCELLED
}

model Listing {
  id                    String         @id @default(cuid())
  sellerId              String
  seller                User           @relation("SellerListings", fields: [sellerId], references: [id], onDelete: Cascade)

  title                 String
  description           String         @db.Text
  category              String
  photos                String[]       // Array of URLs

  pricePerPiece         Float
  quantityTotal         Int
  quantityAvailable     Int
  maxPerBuyer           Int?           // Optional purchase limit

  pickupAddress         String
  pickupInstructions    String?        @db.Text
  location              String         // PostGIS POINT stored as text
  latitude              Float
  longitude             Float

  status                ListingStatus  @default(DRAFT)

  // Relationships
  reservations          Reservation[]

  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  @@index([sellerId])
  @@index([status])
  @@index([category])
  @@index([latitude, longitude])
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  COMPLETED
  NO_SHOW
  CANCELLED
}

model Reservation {
  id                    String            @id @default(cuid())
  listingId             String
  listing               Listing           @relation(fields: [listingId], references: [id], onDelete: Cascade)
  buyerId               String
  buyer                 User              @relation("BuyerReservations", fields: [buyerId], references: [id], onDelete: Cascade)

  quantityReserved      Int
  totalPrice            Float
  depositAmount         Float             // 5% of total

  qrCodeHash            String            @unique
  verificationCode      String            @unique // 6-digit alphanumeric

  status                ReservationStatus @default(PENDING)

  stripePaymentIntentId String?

  expiresAt             DateTime
  completedAt           DateTime?

  // Relationships
  ratings               Rating[]

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  @@index([listingId])
  @@index([buyerId])
  @@index([status])
  @@index([qrCodeHash])
  @@index([verificationCode])
}

model Rating {
  id              String      @id @default(cuid())
  reservationId   String
  reservation     Reservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)

  raterId         String
  rater           User        @relation("RaterRatings", fields: [raterId], references: [id], onDelete: Cascade)
  ratedId         String
  rated           User        @relation("RatedRatings", fields: [ratedId], references: [id], onDelete: Cascade)

  score           Int         // 1-5
  comment         String?     @db.Text
  isVisible       Boolean     @default(false) // Hidden until both parties rate

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@unique([reservationId, raterId])
  @@index([raterId])
  @@index([ratedId])
}

model PostalCode {
  code            String  @id // Canadian postal code (e.g., "M5H 2N2")
  city            String
  province        String
  latitude        Float
  longitude       Float
  location        String  // PostGIS POINT

  @@index([latitude, longitude])
}
```

**Acceptance Criteria:**
- [ ] Schema defines all core entities
- [ ] Relationships properly configured
- [ ] Indexes on frequently queried fields
- [ ] PostGIS fields for geospatial data

---

**Task 1.2.3: Canadian Postal Code Import**

**File:** `packages/db/scripts/import-postal-codes.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as csv from 'csv-parser';

const prisma = new PrismaClient();

async function importPostalCodes() {
  const postalCodes: any[] = [];

  // Read CSV from zipcodesoft.com
  fs.createReadStream('./data/canadian-postal-codes.csv')
    .pipe(csv())
    .on('data', (row) => {
      postalCodes.push({
        code: row.postal_code.toUpperCase(),
        city: row.city,
        province: row.province,
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        location: `POINT(${row.longitude} ${row.latitude})`, // PostGIS format
      });
    })
    .on('end', async () => {
      console.log(`Importing ${postalCodes.length} postal codes...`);

      // Batch insert
      const batchSize = 1000;
      for (let i = 0; i < postalCodes.length; i += batchSize) {
        const batch = postalCodes.slice(i, i + batchSize);
        await prisma.postalCode.createMany({
          data: batch,
          skipDuplicates: true,
        });
        console.log(`Imported ${Math.min(i + batchSize, postalCodes.length)} / ${postalCodes.length}`);
      }

      console.log('Postal code import complete!');
      await prisma.$disconnect();
    });
}

importPostalCodes().catch(console.error);
```

**Acceptance Criteria:**
- [ ] Canadian postal codes imported from zipcodesoft.com
- [ ] PostGIS POINT geometry created for each postal code
- [ ] Spatial index created for proximity searches
- [ ] Script can be re-run for updates

---

### 1.3 Authentication System

**Task 1.3.1: NextAuth v5 Configuration**

**File:** `packages/auth/index.ts`

```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@acme/db";
import { verifyOTP, sendOTP } from "./otp";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      id: "email-otp",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
      },
      authorize: async (credentials) => {
        const isValid = await verifyOTP(
          credentials.email as string,
          credentials.otp as string,
          "email"
        );

        if (!isValid) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          });
        }

        return user;
      },
    }),
    Credentials({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        otp: { label: "OTP", type: "text" },
      },
      authorize: async (credentials) => {
        const isValid = await verifyOTP(
          credentials.phone as string,
          credentials.otp as string,
          "phone"
        );

        if (!isValid) return null;

        const user = await prisma.user.findUnique({
          where: { phone: credentials.phone as string },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: { phoneVerified: true },
          });
        }

        return user;
      },
    }),
  ],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        userType: user.userType,
        accountStatus: user.accountStatus,
      },
    }),
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify',
  },
});
```

**Acceptance Criteria:**
- [ ] NextAuth v5 configured with Prisma adapter
- [ ] Email OTP provider implemented
- [ ] Phone OTP provider implemented
- [ ] Session callback includes user metadata

---

**Task 1.3.2: OTP Service (Email + SMS)**

**File:** `packages/auth/otp.ts`

```typescript
import { Resend } from 'resend';
import twilio from 'twilio';
import { Redis } from 'ioredis';

const resend = new Resend(process.env.RESEND_API_KEY);
const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);
const redis = new Redis(process.env.REDIS_URL);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendEmailOTP(email: string): Promise<void> {
  const otp = generateOTP();

  // Store in Redis with 10-minute expiry
  await redis.setex(`otp:email:${email}`, 600, otp);

  // Send email
  await resend.emails.send({
    from: 'Vendgros <noreply@vendgros.ca>',
    to: email,
    subject: 'Your Vendgros Verification Code',
    html: `
      <h2>Welcome to Vendgros!</h2>
      <p>Your verification code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 8px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
    `,
  });
}

export async function sendPhoneOTP(phone: string): Promise<void> {
  const otp = generateOTP();

  // Store in Redis with 10-minute expiry
  await redis.setex(`otp:phone:${phone}`, 600, otp);

  // Send SMS via Twilio
  await twilioClient.messages.create({
    body: `Your Vendgros verification code is: ${otp}`,
    from: process.env.TWILIO_FROM,
    to: phone,
  });
}

export async function verifyOTP(
  identifier: string,
  otp: string,
  type: 'email' | 'phone'
): Promise<boolean> {
  const key = `otp:${type}:${identifier}`;
  const storedOTP = await redis.get(key);

  if (!storedOTP || storedOTP !== otp) {
    return false;
  }

  // Delete OTP after successful verification
  await redis.del(key);
  return true;
}
```

**Acceptance Criteria:**
- [ ] Email OTP sent via Resend
- [ ] SMS OTP sent via Twilio
- [ ] OTP stored in Redis with 10-minute TTL
- [ ] Rate limiting on OTP requests (max 5 per 15 minutes)

---

**Task 1.3.3: Dual Verification Workflow**

**File:** `packages/api/src/router/auth.ts`

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { sendEmailOTP, sendPhoneOTP } from "@acme/auth/otp";
import { TRPCError } from "@trpc/server";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        phone: z.string().regex(/^\+1[2-9]\d{9}$/), // Canadian phone format
        userType: z.enum(["BUYER", "SELLER_INDIVIDUAL", "SELLER_MERCHANT"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user exists
      const existingUser = await ctx.db.user.findFirst({
        where: {
          OR: [{ email: input.email }, { phone: input.phone }],
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists with this email or phone",
        });
      }

      // Create unverified user
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          phone: input.phone,
          userType: input.userType,
          accountStatus: "UNVERIFIED",
        },
      });

      // Send OTP to both email and phone
      await Promise.all([
        sendEmailOTP(input.email),
        sendPhoneOTP(input.phone),
      ]);

      return { userId: user.id };
    }),

  checkVerificationStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        emailVerified: true,
        phoneVerified: true,
        accountStatus: true,
      },
    });

    // Update account status if both verified
    if (user?.emailVerified && user?.phoneVerified && user.accountStatus === "UNVERIFIED") {
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { accountStatus: "ACTIVE" },
      });
    }

    return user;
  }),

  updateEmail: protectedProcedure
    .input(z.object({ newEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      // Suspend account when email changes
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          email: input.newEmail,
          emailVerified: false,
          accountStatus: "SUSPENDED",
        },
      });

      // Hide all active listings
      await ctx.db.listing.updateMany({
        where: {
          sellerId: ctx.session.user.id,
          status: "PUBLISHED",
        },
        data: { status: "DRAFT" },
      });

      // Send new OTP
      await sendEmailOTP(input.newEmail);

      return { success: true };
    }),

  updatePhone: protectedProcedure
    .input(z.object({ newPhone: z.string().regex(/^\+1[2-9]\d{9}$/) }))
    .mutation(async ({ ctx, input }) => {
      // Suspend account when phone changes
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          phone: input.newPhone,
          phoneVerified: false,
          accountStatus: "SUSPENDED",
        },
      });

      // Hide all active listings
      await ctx.db.listing.updateMany({
        where: {
          sellerId: ctx.session.user.id,
          status: "PUBLISHED",
        },
        data: { status: "DRAFT" },
      });

      // Send new OTP
      await sendPhoneOTP(input.newPhone);

      return { success: true };
    }),
});
```

**Acceptance Criteria:**
- [ ] Registration creates UNVERIFIED user
- [ ] OTP sent to both email and phone
- [ ] Account activates only when both verified
- [ ] Email/phone changes trigger account suspension
- [ ] Active listings hidden during suspension

---

### 1.4 UI Foundation

**Task 1.4.1: Web UI Setup (shadcn/ui)**

**File:** `apps/nextjs/components.json`
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "~/components",
    "utils": "~/lib/utils"
  }
}
```

**Install shadcn/ui components:**
```bash
cd apps/nextjs
npx shadcn-ui@latest add button input label card form
```

**Acceptance Criteria:**
- [ ] shadcn/ui configured
- [ ] Tailwind CSS working
- [ ] Base components available (Button, Input, Card, Form)
- [ ] Dark mode support

---

**Task 1.4.2: Mobile UI Setup (NativeWind + React Native Paper)**

**File:** `apps/expo/app.json`
```json
{
  "expo": {
    "name": "Vendgros",
    "slug": "vendgros-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "ca.vendgros.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "ca.vendgros.app"
    },
    "plugins": [
      "expo-router",
      "expo-camera",
      "expo-location"
    ]
  }
}
```

**File:** `apps/expo/tailwind.config.js`
```javascript
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Acceptance Criteria:**
- [ ] NativeWind configured
- [ ] React Native Paper theme integrated
- [ ] Expo SDK 52+ installed
- [ ] Camera and location permissions configured

---

### 1.5 Internationalization (i18n)

**Task 1.5.1: Web i18n Setup (next-intl)**

**File:** `apps/nextjs/middleware.ts`
```typescript
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
```

**File:** `apps/nextjs/messages/en.json`
```json
{
  "common": {
    "appName": "Vendgros",
    "signIn": "Sign In",
    "signOut": "Sign Out",
    "search": "Search",
    "filter": "Filter"
  },
  "auth": {
    "emailPlaceholder": "Enter your email",
    "phonePlaceholder": "Enter your phone number",
    "otpSent": "Verification code sent",
    "verifyEmail": "Verify Email",
    "verifyPhone": "Verify Phone"
  }
}
```

**Acceptance Criteria:**
- [ ] next-intl configured for web
- [ ] Locale-based routing (/en/, /fr/, /es/)
- [ ] Translation files created (EN/FR/ES)
- [ ] Auto-detect browser language

---

**Task 1.5.2: Mobile i18n Setup (i18next)**

**File:** `apps/expo/i18n/index.ts`
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
    },
    lng: Localization.locale.split('-')[0],
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

**Acceptance Criteria:**
- [ ] i18next configured for mobile
- [ ] Auto-detect device language
- [ ] Translation files synced with web
- [ ] Language switcher in settings

---

## Week 2: Listings & Search

### 2.1 Listing Management

**Task 2.1.1: Listing CRUD tRPC Routes**

**File:** `packages/api/src/router/listing.ts`

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const createListingSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(5000),
  category: z.string(),
  photos: z.array(z.string().url()).min(1).max(10),
  pricePerPiece: z.number().positive(),
  quantityTotal: z.number().int().positive(),
  maxPerBuyer: z.number().int().positive().optional(),
  pickupAddress: z.string(),
  pickupInstructions: z.string().optional(),
});

export const listingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createListingSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if user is verified and active
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (user?.accountStatus !== "ACTIVE") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Account must be verified to create listings",
        });
      }

      // Geocode address using PostGIS
      const geocoded = await geocodeAddress(input.pickupAddress);

      const listing = await ctx.db.listing.create({
        data: {
          ...input,
          sellerId: ctx.session.user.id,
          quantityAvailable: input.quantityTotal,
          latitude: geocoded.lat,
          longitude: geocoded.lng,
          location: `POINT(${geocoded.lng} ${geocoded.lat})`,
          status: "DRAFT",
        },
      });

      return listing;
    }),

  submitForReview: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.listingId },
      });

      if (listing?.sellerId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (listing.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft listings can be submitted",
        });
      }

      return ctx.db.listing.update({
        where: { id: input.listingId },
        data: { status: "PENDING_REVIEW" },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        data: createListingSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.listingId },
      });

      if (listing?.sellerId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Check if critical fields changed
      const criticalFieldsChanged =
        input.data.pricePerPiece !== undefined ||
        input.data.quantityTotal !== undefined ||
        input.data.description !== undefined;

      const newStatus = criticalFieldsChanged ? "PENDING_REVIEW" : listing.status;

      let geocoded;
      if (input.data.pickupAddress) {
        geocoded = await geocodeAddress(input.data.pickupAddress);
      }

      return ctx.db.listing.update({
        where: { id: input.listingId },
        data: {
          ...input.data,
          status: newStatus,
          ...(geocoded && {
            latitude: geocoded.lat,
            longitude: geocoded.lng,
            location: `POINT(${geocoded.lng} ${geocoded.lat})`,
          }),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.listingId },
        include: { reservations: true },
      });

      if (listing?.sellerId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Cannot delete if there are active reservations
      const hasActiveReservations = listing.reservations.some(
        (r) => r.status === "CONFIRMED" || r.status === "PENDING"
      );

      if (hasActiveReservations) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete listing with active reservations",
        });
      }

      return ctx.db.listing.update({
        where: { id: input.listingId },
        data: { status: "CANCELLED" },
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.listing.findUnique({
        where: { id: input.id },
        include: {
          seller: {
            select: {
              id: true,
              userType: true,
              ratingAverage: true,
              ratingCount: true,
            },
          },
        },
      });
    }),

  myListings: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.listing.findMany({
      where: { sellerId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),
});

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  // Use a geocoding service (e.g., Google Maps, Mapbox)
  // For now, return mock data
  return { lat: 43.6532, lng: -79.3832 }; // Toronto
}
```

**Acceptance Criteria:**
- [ ] Sellers can create/update/delete listings
- [ ] Critical field changes trigger re-moderation
- [ ] Address geocoded to PostGIS POINT
- [ ] Cannot delete with active reservations
- [ ] Draft/Published/Pending states managed

---

**Task 2.1.2: Image Upload to DigitalOcean Spaces**

**File:** `packages/api/src/router/upload.ts`

```typescript
import { z } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { randomUUID } from "crypto";

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
});

export const uploadRouter = createTRPCRouter({
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const key = `listings/${ctx.session.user.id}/${randomUUID()}-${input.fileName}`;

      const command = new PutObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: key,
        ContentType: input.fileType,
        ACL: "public-read",
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      const publicUrl = `${process.env.DO_SPACES_URL}/${key}`;

      return { uploadUrl, publicUrl };
    }),
});
```

**Acceptance Criteria:**
- [ ] Pre-signed URLs generated for uploads
- [ ] Images stored in DO Spaces
- [ ] Public URLs returned for Prisma storage
- [ ] Images served via Cloudflare CDN

---

**Task 2.1.3: Web Listing Form**

**File:** `apps/nextjs/app/[locale]/listings/new/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { ImageUpload } from "~/components/image-upload";

const listingSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(5000),
  category: z.string(),
  photos: z.array(z.string().url()).min(1).max(10),
  pricePerPiece: z.number().positive(),
  quantityTotal: z.number().int().positive(),
  maxPerBuyer: z.number().int().positive().optional(),
  pickupAddress: z.string(),
  pickupInstructions: z.string().optional(),
});

export default function NewListingPage() {
  const [photos, setPhotos] = useState<string[]>([]);
  const createListing = api.listing.create.useMutation();

  const form = useForm({
    resolver: zodResolver(listingSchema),
  });

  const onSubmit = async (data: z.infer<typeof listingSchema>) => {
    await createListing.mutateAsync({
      ...data,
      photos,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Create New Listing</h1>

      <div>
        <label>Title</label>
        <Input {...form.register("title")} />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div>
        <label>Description</label>
        <Textarea {...form.register("description")} rows={6} />
      </div>

      <ImageUpload photos={photos} onChange={setPhotos} maxPhotos={10} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Price per Piece</label>
          <Input type="number" step="0.01" {...form.register("pricePerPiece", { valueAsNumber: true })} />
        </div>
        <div>
          <label>Total Quantity</label>
          <Input type="number" {...form.register("quantityTotal", { valueAsNumber: true })} />
        </div>
      </div>

      <div>
        <label>Pickup Address</label>
        <Input {...form.register("pickupAddress")} />
      </div>

      <Button type="submit" disabled={createListing.isPending}>
        {createListing.isPending ? "Creating..." : "Create Listing"}
      </Button>
    </form>
  );
}
```

**Acceptance Criteria:**
- [ ] Form validates with Zod schema
- [ ] Photos uploaded to DO Spaces
- [ ] Address autocomplete (Google Places API)
- [ ] Preview mode before submission
- [ ] Mobile-responsive layout

---

### 2.2 Moderation System

**Task 2.2.1: Admin Moderation Dashboard**

**File:** `packages/api/src/router/admin.ts`

```typescript
import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "../trpc";

export const adminRouter = createTRPCRouter({
  getPendingListings: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.listing.findMany({
      where: { status: "PENDING_REVIEW" },
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            userType: true,
            ratingAverage: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  approveListing: adminProcedure
    .input(z.object({ listingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.listing.update({
        where: { id: input.listingId },
        data: { status: "PUBLISHED" },
      });
    }),

  rejectListing: adminProcedure
    .input(
      z.object({
        listingId: z.string(),
        feedback: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.update({
        where: { id: input.listingId },
        data: { status: "DRAFT" },
      });

      // TODO: Send notification to seller with feedback

      return listing;
    }),
});
```

**Acceptance Criteria:**
- [ ] Admin can view pending listings queue
- [ ] Approve/reject with feedback
- [ ] Notification sent to seller on decision
- [ ] Analytics on moderation metrics

---

### 2.3 Geospatial Search

**Task 2.3.1: PostGIS Proximity Search**

**File:** `packages/api/src/router/search.ts`

```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { Prisma } from "@acme/db";

export const searchRouter = createTRPCRouter({
  byProximity: publicProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number().default(10),
        category: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        sortBy: z.enum(["distance", "price", "date", "rating"]).default("distance"),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Raw SQL query for PostGIS distance calculation
      const listings = await ctx.db.$queryRaw<any[]>`
        SELECT
          l.*,
          ST_Distance(
            l.location::geography,
            ST_MakePoint(${input.longitude}, ${input.latitude})::geography
          ) / 1000 as distance_km,
          u.rating_average as seller_rating
        FROM "Listing" l
        JOIN "User" u ON l.seller_id = u.id
        WHERE l.status = 'PUBLISHED'
          AND ST_DWithin(
            l.location::geography,
            ST_MakePoint(${input.longitude}, ${input.latitude})::geography,
            ${input.radiusKm * 1000}
          )
          ${input.category ? Prisma.sql`AND l.category = ${input.category}` : Prisma.empty}
          ${input.minPrice ? Prisma.sql`AND l.price_per_piece >= ${input.minPrice}` : Prisma.empty}
          ${input.maxPrice ? Prisma.sql`AND l.price_per_piece <= ${input.maxPrice}` : Prisma.empty}
        ORDER BY
          ${input.sortBy === "distance" ? Prisma.sql`distance_km ASC` : Prisma.empty}
          ${input.sortBy === "price" ? Prisma.sql`l.price_per_piece ASC` : Prisma.empty}
          ${input.sortBy === "date" ? Prisma.sql`l.created_at DESC` : Prisma.empty}
          ${input.sortBy === "rating" ? Prisma.sql`seller_rating DESC` : Prisma.empty}
        LIMIT ${input.limit}
      `;

      return listings;
    }),

  byPostalCode: publicProcedure
    .input(
      z.object({
        postalCode: z.string().regex(/^[A-Z]\d[A-Z] \d[A-Z]\d$/),
        radiusKm: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get coordinates from postal code
      const postal = await ctx.db.postalCode.findUnique({
        where: { code: input.postalCode.toUpperCase() },
      });

      if (!postal) {
        return [];
      }

      // Reuse proximity search
      return ctx.procedures.search.byProximity({
        latitude: postal.latitude,
        longitude: postal.longitude,
        radiusKm: input.radiusKm,
      });
    }),
});
```

**Acceptance Criteria:**
- [ ] PostGIS ST_Distance for proximity calculations
- [ ] Search by lat/lng or postal code
- [ ] Filter by category, price range
- [ ] Sort by distance, price, date, rating
- [ ] Results include distance in km

---

**Task 2.3.2: Web Map Display (Mapbox)**

**File:** `apps/nextjs/components/listing-map.tsx`

```typescript
"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface ListingMapProps {
  listings: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
    pricePerPiece: number;
  }>;
  center: [number, number];
}

export function ListingMap({ listings, center }: ListingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: center,
      zoom: 11,
    });

    // Add markers for listings
    listings.forEach((listing) => {
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<h3>${listing.title}</h3><p>$${listing.pricePerPiece} per piece</p>`
      );

      new mapboxgl.Marker()
        .setLngLat([listing.longitude, listing.latitude])
        .setPopup(popup)
        .addTo(map.current!);
    });
  }, [listings, center]);

  return <div ref={mapContainer} className="w-full h-96 rounded-lg" />;
}
```

**Acceptance Criteria:**
- [ ] Mapbox GL JS integrated
- [ ] Markers for each listing
- [ ] Popups show listing details
- [ ] Clustering for dense areas
- [ ] Mobile touch gestures supported

---

**Task 2.3.3: Mobile Map (react-native-maps)**

**File:** `apps/expo/components/listing-map.tsx`

```typescript
import React from "react";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { View, StyleSheet } from "react-native";

interface ListingMapProps {
  listings: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
  }>;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

export function ListingMap({ listings, initialRegion }: ListingMapProps) {
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
      >
        {listings.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{
              latitude: listing.latitude,
              longitude: listing.longitude,
            }}
            title={listing.title}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
```

**Acceptance Criteria:**
- [ ] Google Maps on Android
- [ ] Apple Maps on iOS
- [ ] Markers for listings
- [ ] User location shown
- [ ] Smooth pan/zoom animations

---

## Week 3: Transactions & Engagement

### 3.1 Payment Integration

**Task 3.1.1: Stripe Checkout (5% Deposit)**

**File:** `packages/api/src/router/reservation.ts`

```typescript
import { z } from "zod";
import Stripe from "stripe";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export const reservationRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const listing = await ctx.db.listing.findUnique({
        where: { id: input.listingId },
      });

      if (!listing || listing.status !== "PUBLISHED") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (input.quantity > listing.quantityAvailable) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient quantity available",
        });
      }

      if (listing.maxPerBuyer && input.quantity > listing.maxPerBuyer) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum ${listing.maxPerBuyer} per buyer`,
        });
      }

      const totalPrice = listing.pricePerPiece * input.quantity;
      const depositAmount = totalPrice * 0.05; // 5% deposit

      // Generate QR code hash and 6-digit code
      const qrCodeHash = randomBytes(32).toString("hex");
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create Stripe Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(depositAmount * 100), // Stripe uses cents
        currency: "cad",
        metadata: {
          listingId: input.listingId,
          buyerId: ctx.session.user.id,
          quantity: input.quantity,
        },
      });

      // Create reservation
      const reservation = await ctx.db.reservation.create({
        data: {
          listingId: input.listingId,
          buyerId: ctx.session.user.id,
          quantityReserved: input.quantity,
          totalPrice,
          depositAmount,
          qrCodeHash,
          verificationCode,
          stripePaymentIntentId: paymentIntent.id,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        },
      });

      return {
        reservationId: reservation.id,
        clientSecret: paymentIntent.client_secret,
      };
    }),

  confirmPayment: protectedProcedure
    .input(z.object({ reservationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.db.reservation.findUnique({
        where: { id: input.reservationId },
        include: { listing: true },
      });

      if (!reservation || reservation.buyerId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(
        reservation.stripePaymentIntentId!
      );

      if (paymentIntent.status !== "succeeded") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment not completed",
        });
      }

      // Update reservation and listing inventory
      await ctx.db.$transaction([
        ctx.db.reservation.update({
          where: { id: input.reservationId },
          data: { status: "CONFIRMED" },
        }),
        ctx.db.listing.update({
          where: { id: reservation.listingId },
          data: {
            quantityAvailable: {
              decrement: reservation.quantityReserved,
            },
          },
        }),
      ]);

      // TODO: Send notifications to buyer and seller

      return { success: true };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const reservation = await ctx.db.reservation.findUnique({
        where: { id: input.id },
        include: {
          listing: {
            include: {
              seller: {
                select: {
                  id: true,
                  email: true,
                  phone: true,
                  ratingAverage: true,
                },
              },
            },
          },
        },
      });

      if (!reservation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Only buyer or seller can view
      if (
        reservation.buyerId !== ctx.session.user.id &&
        reservation.listing.sellerId !== ctx.session.user.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return reservation;
    }),

  myReservations: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.reservation.findMany({
      where: { buyerId: ctx.session.user.id },
      include: { listing: true },
      orderBy: { createdAt: "desc" },
    });
  }),
});
```

**Acceptance Criteria:**
- [ ] 5% deposit calculated correctly
- [ ] Stripe Payment Intent created
- [ ] Reservation locked with PENDING status
- [ ] Inventory decremented on payment success
- [ ] QR hash and 6-digit code generated

---

**Task 3.1.2: Web Stripe Integration**

**File:** `apps/nextjs/app/[locale]/checkout/[reservationId]/page.tsx`

```typescript
"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CheckoutForm } from "~/components/checkout-form";
import { api } from "~/trpc/react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage({ params }: { params: { reservationId: string } }) {
  const { data: reservation } = api.reservation.getById.useQuery({
    id: params.reservationId,
  });

  if (!reservation) return <div>Loading...</div>;

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Complete Your Reservation</h1>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <p className="font-semibold">{reservation.listing.title}</p>
        <p>Quantity: {reservation.quantityReserved}</p>
        <p>Total: ${reservation.totalPrice.toFixed(2)}</p>
        <p className="text-lg font-bold mt-2">
          Deposit (5%): ${reservation.depositAmount.toFixed(2)}
        </p>
      </div>

      <Elements stripe={stripePromise} options={{ clientSecret: reservation.clientSecret }}>
        <CheckoutForm reservationId={reservation.id} />
      </Elements>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Stripe Elements loaded
- [ ] Payment form styled
- [ ] 3D Secure support
- [ ] Error handling for failed payments

---

### 3.2 QR Code System

**Task 3.2.1: QR Code Generation**

**File:** `apps/nextjs/app/[locale]/reservations/[id]/qr/page.tsx`

```typescript
"use client";

import { QRCodeSVG } from "qrcode.react";
import { api } from "~/trpc/react";

export default function ReservationQRPage({ params }: { params: { id: string } }) {
  const { data: reservation } = api.reservation.getById.useQuery({ id: params.id });

  if (!reservation) return <div>Loading...</div>;

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">Your Reservation</h1>

      <div className="mb-6">
        <QRCodeSVG
          value={reservation.qrCodeHash}
          size={256}
          level="H"
          includeMargin
          className="mx-auto"
        />
      </div>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <p className="text-sm text-gray-600 mb-2">Manual Verification Code</p>
        <p className="text-3xl font-mono font-bold tracking-widest">
          {reservation.verificationCode}
        </p>
      </div>

      <div className="text-left space-y-2">
        <p><strong>Item:</strong> {reservation.listing.title}</p>
        <p><strong>Quantity:</strong> {reservation.quantityReserved}</p>
        <p><strong>Balance Due:</strong> ${(reservation.totalPrice - reservation.depositAmount).toFixed(2)}</p>
        <p><strong>Pickup:</strong> {reservation.listing.pickupAddress}</p>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] QR code encodes reservation hash
- [ ] 6-digit code displayed prominently
- [ ] Reservation details shown
- [ ] Downloadable/printable

---

**Task 3.2.2: QR Scanner (Mobile)**

**File:** `apps/expo/app/(tabs)/scan.tsx`

```typescript
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { api } from "~/utils/api";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const verifyQR = api.reservation.verifyQR.useMutation();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need camera permission to scan QR codes</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const result = await verifyQR.mutateAsync({ qrCodeHash: data });
      // Navigate to confirmation screen
    } catch (error) {
      alert("Invalid QR code");
      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      {scanned && <Button title="Scan Again" onPress={() => setScanned(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
});
```

**File:** `packages/api/src/router/reservation.ts` (add to existing router)

```typescript
verifyQR: protectedProcedure
  .input(z.object({ qrCodeHash: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const reservation = await ctx.db.reservation.findUnique({
      where: { qrCodeHash: input.qrCodeHash },
      include: {
        listing: {
          select: {
            sellerId: true,
          },
        },
        buyer: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invalid QR code",
      });
    }

    // Only seller can scan
    if (reservation.listing.sellerId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    if (reservation.status !== "CONFIRMED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Reservation not confirmed",
      });
    }

    return {
      reservationId: reservation.id,
      buyerInfo: reservation.buyer,
      quantity: reservation.quantityReserved,
      balanceDue: reservation.totalPrice - reservation.depositAmount,
    };
  }),

completePickup: protectedProcedure
  .input(
    z.object({
      reservationId: z.string(),
      signature: z.string().optional(), // Base64 image
    })
  )
  .mutation(async ({ ctx, input }) => {
    const reservation = await ctx.db.reservation.findUnique({
      where: { id: input.reservationId },
      include: { listing: true },
    });

    if (!reservation) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // Only seller can complete
    if (reservation.listing.sellerId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    await ctx.db.reservation.update({
      where: { id: input.reservationId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // TODO: Trigger rating prompts for both parties

    return { success: true };
  }),
```

**Acceptance Criteria:**
- [ ] Camera permission requested
- [ ] QR codes scanned and validated
- [ ] Seller confirms buyer identity
- [ ] Digital signature captured (optional)
- [ ] Transaction marked complete

---

### 3.3 Rating System

**Task 3.3.1: Bi-Directional Blind Ratings**

**File:** `packages/api/src/router/rating.ts`

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const ratingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        reservationId: z.string(),
        score: z.number().int().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.db.reservation.findUnique({
        where: { id: input.reservationId },
        include: {
          listing: { select: { sellerId: true } },
          ratings: true,
        },
      });

      if (!reservation || reservation.status !== "COMPLETED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only rate completed transactions",
        });
      }

      // Check if 7-day window has passed
      const completedAt = reservation.completedAt!;
      const windowEnd = new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() > windowEnd) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Rating window has closed",
        });
      }

      // Determine who is rating whom
      const isBuyer = reservation.buyerId === ctx.session.user.id;
      const isSeller = reservation.listing.sellerId === ctx.session.user.id;

      if (!isBuyer && !isSeller) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const raterId = ctx.session.user.id;
      const ratedId = isBuyer ? reservation.listing.sellerId : reservation.buyerId;

      // Check if already rated
      const existingRating = reservation.ratings.find((r) => r.raterId === raterId);
      if (existingRating) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already rated this transaction",
        });
      }

      // Create rating
      const rating = await ctx.db.rating.create({
        data: {
          reservationId: input.reservationId,
          raterId,
          ratedId,
          score: input.score,
          comment: input.comment,
          isVisible: false, // Hidden until both parties rate
        },
      });

      // Check if both parties have now rated
      const allRatings = await ctx.db.rating.findMany({
        where: { reservationId: input.reservationId },
      });

      if (allRatings.length === 2) {
        // Make both ratings visible
        await ctx.db.rating.updateMany({
          where: { reservationId: input.reservationId },
          data: { isVisible: true },
        });

        // Update user rating averages
        for (const r of allRatings) {
          await updateUserRating(ctx.db, r.ratedId);
        }
      }

      return rating;
    }),

  getForReservation: protectedProcedure
    .input(z.object({ reservationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const reservation = await ctx.db.reservation.findUnique({
        where: { id: input.reservationId },
        include: {
          ratings: {
            where: {
              OR: [
                { isVisible: true },
                { raterId: ctx.session.user.id }, // Can see own rating even if hidden
              ],
            },
          },
        },
      });

      return reservation?.ratings ?? [];
    }),
});

async function updateUserRating(db: any, userId: string) {
  const ratings = await db.rating.findMany({
    where: {
      ratedId: userId,
      isVisible: true,
    },
  });

  const average = ratings.reduce((sum: number, r: any) => sum + r.score, 0) / ratings.length;

  await db.user.update({
    where: { id: userId },
    data: {
      ratingAverage: average,
      ratingCount: ratings.length,
    },
  });
}
```

**Acceptance Criteria:**
- [ ] Both parties can rate within 7 days
- [ ] Ratings hidden until both submitted
- [ ] 1-star auto-assigned for no-shows
- [ ] User rating averages updated
- [ ] Cannot rate same transaction twice

---

### 3.4 Notification System

**Task 3.4.1: Email Notifications (Resend)**

**File:** `packages/notifications/email.ts`

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReservationConfirmation(params: {
  to: string;
  buyerName: string;
  listingTitle: string;
  quantity: number;
  totalPrice: number;
  depositPaid: number;
  pickupAddress: string;
  qrCodeUrl: string;
}) {
  await resend.emails.send({
    from: "Vendgros <reservations@vendgros.ca>",
    to: params.to,
    subject: "Reservation Confirmed - Vendgros",
    html: `
      <h2>Reservation Confirmed!</h2>
      <p>Hi ${params.buyerName},</p>
      <p>Your reservation has been confirmed for:</p>
      <ul>
        <li><strong>Item:</strong> ${params.listingTitle}</li>
        <li><strong>Quantity:</strong> ${params.quantity}</li>
        <li><strong>Total:</strong> $${params.totalPrice.toFixed(2)}</li>
        <li><strong>Deposit Paid:</strong> $${params.depositPaid.toFixed(2)}</li>
        <li><strong>Balance Due:</strong> $${(params.totalPrice - params.depositPaid).toFixed(2)}</li>
      </ul>
      <p><strong>Pickup Address:</strong><br>${params.pickupAddress}</p>
      <p><a href="${params.qrCodeUrl}">View Your QR Code</a></p>
    `,
  });
}

export async function sendNewReservationToSeller(params: {
  to: string;
  sellerName: string;
  listingTitle: string;
  quantity: number;
  buyerEmail: string;
}) {
  await resend.emails.send({
    from: "Vendgros <notifications@vendgros.ca>",
    to: params.to,
    subject: "New Reservation - Vendgros",
    html: `
      <h2>New Reservation!</h2>
      <p>Hi ${params.sellerName},</p>
      <p>You have a new reservation:</p>
      <ul>
        <li><strong>Item:</strong> ${params.listingTitle}</li>
        <li><strong>Quantity:</strong> ${params.quantity}</li>
        <li><strong>Buyer:</strong> ${params.buyerEmail}</li>
      </ul>
      <p>Please prepare the items for pickup.</p>
    `,
  });
}
```

**Acceptance Criteria:**
- [ ] Email templates for all events
- [ ] Branded HTML emails
- [ ] Unsubscribe links
- [ ] Multi-language support

---

**Task 3.4.2: SMS Notifications (Twilio)**

**File:** `packages/notifications/sms.ts`

```typescript
import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

export async function sendPickupReminder(phone: string, listingTitle: string) {
  await client.messages.create({
    body: `Reminder: Your pickup for "${listingTitle}" is scheduled. View details in the Vendgros app.`,
    from: process.env.TWILIO_FROM,
    to: phone,
  });
}

export async function sendNewReservationSMS(phone: string, quantity: number) {
  await client.messages.create({
    body: `New reservation! ${quantity} items reserved. Check your Vendgros dashboard.`,
    from: process.env.TWILIO_FROM,
    to: phone,
  });
}
```

**Acceptance Criteria:**
- [ ] SMS for critical events only
- [ ] Canadian phone numbers (+1)
- [ ] Rate limiting to avoid spam
- [ ] Opt-out mechanism

---

**Task 3.4.3: Push Notifications (Expo)**

**File:** `apps/expo/utils/notifications.ts`

```typescript
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
}

export async function sendLocalNotification(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: null, // Immediate
  });
}
```

**Acceptance Criteria:**
- [ ] Expo push tokens registered
- [ ] Push notifications sent from backend
- [ ] Local notifications for proximity alerts
- [ ] Notification settings in user profile

---

## Week 4: Launch Preparation

### 4.1 Web Fallback Features

**Task 4.1.1: Manual Verification Code Entry**

**File:** `apps/nextjs/app/[locale]/verify/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export default function ManualVerifyPage() {
  const [code, setCode] = useState("");
  const verifyCode = api.reservation.verifyCode.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await verifyCode.mutateAsync({ verificationCode: code.toUpperCase() });
      // Show reservation details
    } catch (error) {
      alert("Invalid code");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Manual Verification</h1>
      <p className="mb-6">Enter the 6-digit code from the buyer:</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-2xl tracking-widest font-mono text-center"
          placeholder="XXXXXX"
        />
        <Button type="submit" className="w-full">
          Verify Code
        </Button>
      </form>
    </div>
  );
}
```

**File:** `packages/api/src/router/reservation.ts` (add)

```typescript
verifyCode: protectedProcedure
  .input(z.object({ verificationCode: z.string().length(6) }))
  .mutation(async ({ ctx, input }) => {
    const reservation = await ctx.db.reservation.findUnique({
      where: { verificationCode: input.verificationCode.toUpperCase() },
      include: {
        listing: { select: { sellerId: true } },
        buyer: { select: { email: true, phone: true } },
      },
    });

    if (!reservation) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    if (reservation.listing.sellerId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return {
      reservationId: reservation.id,
      buyerInfo: reservation.buyer,
      quantity: reservation.quantityReserved,
      balanceDue: reservation.totalPrice - reservation.depositAmount,
    };
  }),
```

**Acceptance Criteria:**
- [ ] 6-digit code entry form
- [ ] Code validation
- [ ] Displays reservation details
- [ ] Accessible on web dashboard

---

### 4.2 Testing & QA

**Task 4.2.1: End-to-End Testing**

**File:** `apps/nextjs/e2e/listing-flow.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Listing Flow", () => {
  test("seller can create and publish listing", async ({ page }) => {
    await page.goto("/auth/signin");

    // Sign in as seller
    await page.fill('input[name="email"]', "seller@test.com");
    await page.click('button[type="submit"]');

    // Create listing
    await page.goto("/listings/new");
    await page.fill('input[name="title"]', "Bulk Office Chairs - 50 units");
    await page.fill('textarea[name="description"]', "High-quality office chairs...");

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/listings\/[a-z0-9]+/);
  });

  test("buyer can reserve and checkout", async ({ page }) => {
    // ... test reservation flow
  });
});
```

**Acceptance Criteria:**
- [ ] E2E tests for critical paths
- [ ] Integration tests for tRPC routes
- [ ] Unit tests for business logic
- [ ] 80%+ code coverage

---

**Task 4.2.2: Mobile Testing**

**File:** `apps/expo/e2e/qr-scan.test.ts`

```typescript
import { by, device, element, expect } from "detox";

describe("QR Scanning", () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it("should scan QR code and display reservation", async () => {
    await element(by.text("Scan")).tap();

    // Grant camera permission
    await element(by.text("Grant Permission")).tap();

    // Simulate QR scan (requires mock)
    // ...

    await expect(element(by.text("Reservation Details"))).toBeVisible();
  });
});
```

**Acceptance Criteria:**
- [ ] Detox tests for mobile critical flows
- [ ] Camera permission handling tested
- [ ] QR scanning mocked in tests

---

### 4.3 Production Deployment

**Task 4.3.1: DigitalOcean App Platform Setup**

**File:** `.do/app.yaml`

```yaml
name: vendgros-app
region: tor
domains:
  - domain: vendgros.ca
    type: PRIMARY

services:
  - name: web
    github:
      repo: vendgros/vendgros-app
      branch: main
      deploy_on_push: true
    build_command: cd apps/nextjs && pnpm build
    run_command: cd apps/nextjs && pnpm start
    environment_slug: node-js
    instance_count: 2
    instance_size_slug: basic-xs
    envs:
      - key: POSTGRES_URL
        scope: RUN_TIME
        type: SECRET
        value: ${db.DATABASE_URL}
      - key: REDIS_URL
        scope: RUN_TIME
        type: SECRET
        value: ${redis.REDIS_URL}
      - key: NEXTAUTH_URL
        value: https://vendgros.ca
      - key: NEXTAUTH_SECRET
        type: SECRET

databases:
  - name: db
    engine: PG
    version: "16"
    size: db-s-1vcpu-1gb

  - name: redis
    engine: REDIS
    version: "7"
```

**Acceptance Criteria:**
- [ ] Web app deployed to DO App Platform
- [ ] PostgreSQL 16 + PostGIS provisioned
- [ ] Redis provisioned
- [ ] Auto-deploy on git push
- [ ] Environment variables configured

---

**Task 4.3.2: Cloudflare CDN Setup**

**Steps:**
1. Add vendgros.ca to Cloudflare
2. Configure DNS:
   - `A` record → DigitalOcean App Platform IP
   - `CNAME` for www → vendgros.ca
3. Enable:
   - WAF (Web Application Firewall)
   - DDoS protection
   - Image optimization
   - Caching rules for static assets
4. Configure CSP headers

**Acceptance Criteria:**
- [ ] SSL/TLS certificate active
- [ ] WAF rules enabled
- [ ] Image optimization working
- [ ] CDN cache hit rate > 80%

---

**Task 4.3.3: Mobile App Submission**

**iOS (TestFlight):**
```bash
cd apps/expo
eas build --platform ios --profile preview
eas submit --platform ios --latest
```

**Android (Internal Testing):**
```bash
eas build --platform android --profile preview
eas submit --platform android --latest
```

**File:** `apps/expo/eas.json`
```json
{
  "build": {
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "distribution": "store"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "developer@vendgros.ca",
        "ascAppId": "XXXXXXXXXX",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**Acceptance Criteria:**
- [ ] iOS app on TestFlight
- [ ] Android app on Internal Testing
- [ ] App metadata configured
- [ ] Screenshots uploaded
- [ ] Privacy policy linked

---

### 4.4 Launch Checklist

**Task 4.4.1: Pre-Launch Verification**

**Checklist:**

- [ ] **Authentication**
  - [ ] Email OTP working
  - [ ] SMS OTP working
  - [ ] Dual verification enforced
  - [ ] Account suspension on email/phone change

- [ ] **Listings**
  - [ ] Create/edit/delete working
  - [ ] Photo upload to DO Spaces
  - [ ] Moderation queue functional
  - [ ] Geospatial search accurate
  - [ ] Map markers displaying

- [ ] **Reservations**
  - [ ] Stripe 5% deposit processing
  - [ ] QR codes generated
  - [ ] QR scanner working (mobile)
  - [ ] Manual verification working (web)
  - [ ] Inventory decremented

- [ ] **Ratings**
  - [ ] Bi-directional ratings hidden until both submit
  - [ ] Rating window (7 days) enforced
  - [ ] User averages calculated
  - [ ] No-show auto-rating

- [ ] **Notifications**
  - [ ] Email notifications sent
  - [ ] SMS notifications sent
  - [ ] Push notifications working
  - [ ] Unsubscribe links functional

- [ ] **Security**
  - [ ] TLS 1.3 enabled
  - [ ] WAF active
  - [ ] Rate limiting working
  - [ ] CSRF protection
  - [ ] Input validation via Zod

- [ ] **Performance**
  - [ ] Page load < 3s
  - [ ] API response < 500ms
  - [ ] PostGIS queries optimized
  - [ ] Lighthouse score > 90

- [ ] **Compliance**
  - [ ] Privacy policy published (EN/FR)
  - [ ] Terms of service published (EN/FR)
  - [ ] PIPEDA compliance verified
  - [ ] Data in Canadian datacenter

---

## Post-MVP Roadmap

### Phase 1 (Weeks 5-8)

**Task P1.1: AI Moderation Agent**
- Implement image analysis for listing photos
- NLP for description screening
- Auto-approve low-risk listings
- Flag suspicious patterns

**Task P1.2: In-App Messaging**
- Buyer-seller chat
- Message encryption
- Image sharing
- Notification integration

**Task P1.3: Advanced Analytics**
- Seller dashboard with insights
- Revenue tracking
- Performance metrics
- Geographic heatmaps

---

### Phase 2 (Weeks 9-12)

**Task P2.1: Pricing AI Agent**
- Price recommendations
- Market analysis
- Overpricing alerts

**Task P2.2: Seller Verification Badges**
- Business verification
- Trust badges
- Enhanced profiles

**Task P2.3: International Expansion**
- Deploy vendgros.com
- Multi-currency support
- Country-specific regulations

---

### Phase 3 (Weeks 13+)

**Task P3.1: Trust & Safety AI**
- Fraud detection
- Behavior analysis
- No-show prediction
- Review authenticity

**Task P3.2: Advanced Features**
- Scheduled listings
- Bulk import tools
- API for integrations
- White-label solution

---

## Implementation Guidelines

### Code Quality Standards

1. **TypeScript Strict Mode**
   - Enable `strict: true` in all tsconfig.json
   - No `any` types (use `unknown` or proper types)
   - Explicit return types for functions

2. **Zod Validation**
   - All API inputs validated with Zod
   - Shared schemas in `packages/validators`
   - Reuse schemas on frontend and backend

3. **Error Handling**
   - Use tRPC error codes (BAD_REQUEST, UNAUTHORIZED, etc.)
   - User-friendly error messages
   - Sentry integration for error tracking

4. **Testing**
   - Unit tests for business logic
   - Integration tests for tRPC routes
   - E2E tests for critical flows
   - Aim for 80%+ coverage

5. **Performance**
   - Database indexes on frequently queried fields
   - Redis caching for expensive queries
   - Image optimization via Cloudflare
   - Lazy loading for mobile lists

6. **Security**
   - Never trust client input
   - Validate all data with Zod
   - Use Prisma parameterized queries
   - Rate limiting on all endpoints
   - CSRF protection via NextAuth

---

### Git Workflow

**Branch Strategy:**
```
main → production
develop → staging
feature/* → feature branches
hotfix/* → urgent fixes
```

**Commit Convention:**
```
feat: Add QR code generation
fix: Correct deposit calculation
refactor: Simplify listing query
docs: Update API documentation
test: Add reservation flow tests
```

**Pull Request Template:**
```markdown
## Description
[What does this PR do?]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] TypeScript compiles without errors
- [ ] No console.log statements
- [ ] Updated documentation
```

---

### Environment Variables

**File:** `.env.example`

```bash
# Database
POSTGRES_URL="postgresql://postgres:@127.0.0.1:5432/vendgros-app"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Twilio
TWILIO_SID=""
TWILIO_TOKEN=""
TWILIO_FROM="+14163916295"

# Resend
RESEND_API_KEY=""

# DigitalOcean Spaces
DO_SPACES_KEY="DO801QMLYTVKG6MEVPBU"
DO_SPACES_SECRET="Cb5mmtSvoA4J7eaRmaZ3T9W89S8ny6A/IHLpaR/d1F8"
DO_SPACES_REGION="tor1"
DO_SPACES_BUCKET="repotz-master"
DO_SPACES_ENDPOINT="https://tor1.digitaloceanspaces.com"
DO_SPACES_URL="https://repotz-master.tor1.digitaloceanspaces.com"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=""
```

---

### Documentation Requirements

**For Each Feature:**
1. API documentation (tRPC routes)
2. Component documentation (JSDoc)
3. User-facing documentation (help center)
4. Technical architecture diagrams

**API Documentation Example:**
```typescript
/**
 * Creates a new listing for the authenticated seller.
 *
 * @requires Authentication
 * @requires Verified account (email + phone)
 *
 * @param input - Listing details
 * @returns Created listing with DRAFT status
 *
 * @throws FORBIDDEN - If account not verified
 * @throws BAD_REQUEST - If validation fails
 *
 * @example
 * const listing = await api.listing.create.mutate({
 *   title: "Office Chairs - 50 units",
 *   description: "High-quality ergonomic chairs...",
 *   category: "furniture",
 *   photos: ["https://..."],
 *   pricePerPiece: 25.00,
 *   quantityTotal: 50,
 *   pickupAddress: "123 Main St, Toronto, ON",
 * });
 */
```

---

### Monitoring & Observability

**Sentry Integration:**
```typescript
// apps/nextjs/sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**Metrics to Track:**
- API response times
- Database query performance
- Error rates by endpoint
- User conversion funnel
- Geographic distribution
- Revenue metrics

---

## Success Criteria

**Week 1 Complete:**
- [ ] Database schema deployed
- [ ] Authentication working (email + phone OTP)
- [ ] UI foundations in place
- [ ] i18n configured (EN/FR/ES)

**Week 2 Complete:**
- [ ] Listings CRUD functional
- [ ] Geospatial search working
- [ ] Map display with markers
- [ ] Photo upload to DO Spaces
- [ ] Moderation dashboard operational

**Week 3 Complete:**
- [ ] Stripe 5% deposit checkout
- [ ] QR code generation/scanning
- [ ] Bi-directional blind ratings
- [ ] Push notifications working
- [ ] Transaction completion flow

**Week 4 Complete:**
- [ ] Web fallback features
- [ ] E2E tests passing
- [ ] Production deployed to vendgros.ca
- [ ] Mobile apps on TestFlight/Internal Testing
- [ ] All documentation complete

**MVP Launch:**
- [ ] 10+ pilot sellers onboarded
- [ ] 50+ listings published
- [ ] 20+ successful transactions
- [ ] < 5% no-show rate
- [ ] 4.5+ average rating
- [ ] 99.5% uptime maintained

---

## Support & Resources

**Documentation:**
- T3 Stack: https://create.t3.gg/
- tRPC: https://trpc.io/docs
- Prisma: https://www.prisma.io/docs
- Next.js 15: https://nextjs.org/docs
- Expo: https://docs.expo.dev/

**Community:**
- Discord: [Create internal server]
- GitHub Discussions: [Enable on repo]
- Weekly standups: [Schedule recurring meetings]

**Escalation:**
- Technical blockers → Lead developer
- Product decisions → Product owner
- Security issues → Security team (immediate)

---

**End of Project Plan**
