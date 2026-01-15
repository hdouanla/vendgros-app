# Vendgros API Reference

Complete API documentation for the Vendgros marketplace tRPC API.

## Overview

The Vendgros API is built with tRPC, providing end-to-end type safety between client and server. All endpoints return typed responses and enforce input validation using Zod schemas.

**Base URL**: `https://vendgros.com/api/trpc`

**Authentication**: Session-based with HTTP-only cookies

---

## Table of Contents

1. [Authentication](#authentication)
2. [Listings API](#listings-api)
3. [Reservations API](#reservations-api)
4. [Ratings API](#ratings-api)
5. [Payments API](#payments-api)
6. [Upload API](#upload-api)
7. [Admin API](#admin-api)
8. [User API](#user-api)
9. [Error Handling](#error-handling)

---

## Authentication

### POST /auth.requestOTP

Request OTP code for authentication.

**Input:**
```typescript
{
  contact: string;           // Email or phone number
  method: "EMAIL" | "SMS";  // Delivery method
}
```

**Response:**
```typescript
{
  success: boolean;
  expiresAt: Date;
  message: string;
}
```

**Example:**
```typescript
const result = await trpc.auth.requestOTP.mutate({
  contact: "user@example.com",
  method: "EMAIL"
});
```

### POST /auth.verifyOTP

Verify OTP code and create session.

**Input:**
```typescript
{
  contact: string;  // Email or phone used for OTP
  code: string;     // 6-digit OTP code
}
```

**Response:**
```typescript
{
  success: boolean;
  user: {
    id: string;
    email: string;
    phone: string | null;
    accountType: "INDIVIDUAL" | "BUSINESS" | "ADMIN";
    businessName: string | null;
    ratingAverage: number | null;
    ratingCount: number;
  }
}
```

### GET /auth.getSession

Get current authenticated user session.

**Input:** None (uses session cookie)

**Response:**
```typescript
{
  user: {
    id: string;
    email: string;
    phone: string | null;
    accountType: "INDIVIDUAL" | "BUSINESS" | "ADMIN";
    businessName: string | null;
    ratingAverage: number | null;
    ratingCount: number;
    createdAt: Date;
  } | null
}
```

### POST /auth.signOut

Sign out and destroy session.

**Input:** None

**Response:**
```typescript
{
  success: boolean;
}
```

---

## Listings API

### POST /listing.create

Create a new listing (draft state).

**Auth Required:** Yes

**Input:**
```typescript
{
  title: string;                    // 3-200 characters
  description: string;              // 10-2000 characters
  category: string;                 // e.g., "produce", "bakery"
  photos: string[];                 // Array of S3 URLs
  pricePerPiece: number;           // Positive number
  quantityAvailable: number;        // Positive integer
  maxPerBuyer: number;             // Optional, defaults to quantityAvailable
  pickupAddress: string;           // Full address
  pickupInstructions: string | null;
  latitude: number;                // -90 to 90
  longitude: number;               // -180 to 180
}
```

**Response:**
```typescript
{
  id: string;
  // ... all listing fields
  status: "DRAFT";
  createdAt: Date;
}
```

**Example:**
```typescript
const listing = await trpc.listing.create.mutate({
  title: "Fresh Organic Apples",
  description: "Locally grown organic apples from my orchard",
  category: "produce",
  photos: ["https://cdn.vendgros.com/listings/user123/apple1.jpg"],
  pricePerPiece: 2.50,
  quantityAvailable: 100,
  maxPerBuyer: 20,
  pickupAddress: "123 Farm Road, Toronto, ON M5H 2N2",
  pickupInstructions: "Call when you arrive",
  latitude: 43.6532,
  longitude: -79.3832
});
```

### GET /listing.getById

Get listing by ID.

**Input:**
```typescript
{
  id: string;  // Listing UUID
}
```

**Response:**
```typescript
{
  id: string;
  title: string;
  description: string;
  category: string;
  photos: string[];
  pricePerPiece: number;
  quantityAvailable: number;
  maxPerBuyer: number;
  pickupAddress: string;
  pickupInstructions: string | null;
  latitude: number;
  longitude: number;
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
  seller: {
    id: string;
    email: string;
    businessName: string | null;
    ratingAverage: number | null;
    ratingCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### GET /listing.search

Search listings by proximity.

**Input:**
```typescript
{
  // Option 1: Search by coordinates
  latitude?: number;
  longitude?: number;

  // Option 2: Search by postal code
  postalCode?: string;  // Canadian postal code (e.g., "M5H 2N2")

  radiusKm: number;     // Search radius in kilometers (5-100)
  category?: string;    // Optional category filter
  minPrice?: number;
  maxPrice?: number;
  limit?: number;       // Default: 50, Max: 100
  offset?: number;      // For pagination
}
```

**Response:**
```typescript
{
  listings: Array<{
    listing: {
      id: string;
      title: string;
      description: string;
      category: string;
      photos: string[];
      pricePerPiece: number;
      quantityAvailable: number;
      latitude: number;
      longitude: number;
      seller: {
        businessName: string | null;
        ratingAverage: number | null;
        ratingCount: number;
      };
    };
    distance: number;  // Distance in kilometers
  }>;
  total: number;
}
```

**Example:**
```typescript
const results = await trpc.listing.search.query({
  postalCode: "M5H 2N2",
  radiusKm: 10,
  category: "produce",
  minPrice: 1,
  maxPrice: 10,
  limit: 20
});
```

### GET /listing.getMyListings

Get listings created by current user.

**Auth Required:** Yes

**Input:**
```typescript
{
  status?: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
  limit?: number;   // Default: 50
  offset?: number;
}
```

**Response:**
```typescript
{
  listings: Array<{
    id: string;
    title: string;
    status: string;
    quantityAvailable: number;
    pricePerPiece: number;
    createdAt: Date;
  }>;
  total: number;
}
```

### PUT /listing.update

Update existing listing.

**Auth Required:** Yes (must be listing owner)

**Input:**
```typescript
{
  id: string;
  // Any fields from create (all optional)
  title?: string;
  description?: string;
  pricePerPiece?: number;
  // ...
}
```

**Response:** Updated listing object

### POST /listing.submitForReview

Submit draft listing for admin review.

**Auth Required:** Yes

**Input:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  id: string;
  status: "PENDING_REVIEW";
}
```

### DELETE /listing.delete

Delete listing (soft delete).

**Auth Required:** Yes

**Input:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

---

## Reservations API

### POST /reservation.create

Create reservation for a listing.

**Auth Required:** Yes

**Input:**
```typescript
{
  listingId: string;
  quantityReserved: number;  // Must not exceed listing.maxPerBuyer
}
```

**Response:**
```typescript
{
  id: string;
  listingId: string;
  userId: string;
  quantityReserved: number;
  totalPrice: number;          // pricePerPiece * quantityReserved
  depositAmount: number;       // totalPrice * 0.05
  status: "PENDING";
  qrCodeHash: string;          // SHA-256 hash for QR code
  verificationCode: string;    // 6-digit PIN
  expiresAt: Date;            // 48 hours from creation
  createdAt: Date;
}
```

**Example:**
```typescript
const reservation = await trpc.reservation.create.mutate({
  listingId: "listing-uuid",
  quantityReserved: 10
});

// Redirect to payment:
router.push(`/payment/${reservation.id}`);
```

### GET /reservation.getById

Get reservation details.

**Auth Required:** Yes

**Input:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  id: string;
  listing: {
    id: string;
    title: string;
    pricePerPiece: number;
    pickupAddress: string;
    pickupInstructions: string | null;
    seller: {
      email: string;
      phone: string | null;
      businessName: string | null;
      ratingAverage: number | null;
      ratingCount: number;
    };
  };
  quantityReserved: number;
  totalPrice: number;
  depositAmount: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
  qrCodeHash: string;
  verificationCode: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### GET /reservation.getMyReservations

Get reservations for current user.

**Auth Required:** Yes

**Input:**
```typescript
{
  status?: "PENDING" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  reservations: Array<{
    id: string;
    listing: { title: string };
    quantityReserved: number;
    totalPrice: number;
    status: string;
    expiresAt: Date;
    createdAt: Date;
  }>;
  total: number;
}
```

### POST /reservation.verify

Verify QR code or PIN for pickup (seller only).

**Auth Required:** Yes

**Input:**
```typescript
{
  // Use ONE of:
  qrCodeHash?: string;          // SHA-256 hash from QR code
  verificationCode?: string;    // 6-digit PIN
}
```

**Response:**
```typescript
{
  valid: boolean;
  reservation: {
    id: string;
    listing: { title: string };
    buyer: { email: string };
    quantityReserved: number;
    totalPrice: number;
    depositAmount: number;
    balanceDue: number;
  } | null;
}
```

### POST /reservation.completePickup

Mark reservation as completed after pickup.

**Auth Required:** Yes (seller only)

**Input:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  id: string;
  status: "COMPLETED";
  completedAt: Date;
}
```

### POST /reservation.reportNoShow

Report buyer no-show (after 48 hours).

**Auth Required:** Yes (seller only)

**Input:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  id: string;
  status: "NO_SHOW";
  refundIssued: boolean;
}
```

### POST /reservation.cancel

Cancel reservation.

**Auth Required:** Yes

**Input:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  id: string;
  status: "CANCELLED";
  refundIssued: boolean;
}
```

---

## Ratings API

### POST /rating.submit

Submit rating for a completed reservation.

**Auth Required:** Yes

**Input:**
```typescript
{
  reservationId: string;
  score: number;         // 1-5
  comment?: string;      // Optional, max 500 characters
}
```

**Response:**
```typescript
{
  id: string;
  reservationId: string;
  score: number;
  comment: string | null;
  isVisible: boolean;    // false until both parties rate
  createdAt: Date;
}
```

**Business Rules:**
- Can only rate within 7 days of pickup
- Cannot rate same reservation twice
- Rating remains hidden until both parties submit

### GET /rating.getForReservation

Get ratings for a reservation.

**Auth Required:** Yes

**Input:**
```typescript
{
  reservationId: string;
}
```

**Response:**
```typescript
{
  myRating: {
    score: number;
    comment: string | null;
  } | null;
  theirRating: {
    score: number;
    comment: string | null;
  } | null;  // null if not both submitted
  bothRated: boolean;
}
```

### GET /rating.getForUser

Get ratings for a specific user.

**Input:**
```typescript
{
  userId: string;
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  ratings: Array<{
    score: number;
    comment: string | null;
    createdAt: Date;
  }>;
  average: number;
  total: number;
}
```

---

## Payments API

### POST /payment.createPaymentIntent

Create Stripe PaymentIntent for deposit.

**Auth Required:** Yes

**Input:**
```typescript
{
  reservationId: string;
  amount: number;         // Deposit amount in CAD
}
```

**Response:**
```typescript
{
  clientSecret: string;   // For Stripe Elements
  paymentIntentId: string;
}
```

**Example:**
```typescript
const { clientSecret } = await trpc.payment.createPaymentIntent.mutate({
  reservationId: reservation.id,
  amount: reservation.depositAmount
});

// Use with Stripe Elements
<Elements stripe={stripePromise} options={{ clientSecret }}>
  <PaymentForm />
</Elements>
```

### POST /payment.verifyPayment

Verify payment and confirm reservation.

**Auth Required:** Yes

**Input:**
```typescript
{
  paymentIntentId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  reservation: {
    id: string;
    status: "CONFIRMED";
  };
}
```

### GET /payment.getPaymentStatus

Get payment status for reservation.

**Auth Required:** Yes

**Input:**
```typescript
{
  reservationId: string;
}
```

**Response:**
```typescript
{
  depositPaid: boolean;
  paymentIntentId: string | null;
  paidAt: Date | null;
}
```

### POST /payment.refund

Issue refund (admin only).

**Auth Required:** Yes (admin)

**Input:**
```typescript
{
  reservationId: string;
  reason: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  refundId: string;
  amount: number;
}
```

---

## Upload API

### POST /upload.getUploadUrl

Get pre-signed URL for direct S3 upload.

**Auth Required:** Yes

**Input:**
```typescript
{
  fileName: string;                                  // e.g., "apple.jpg"
  fileType: "image/jpeg" | "image/png" | "image/webp";
}
```

**Response:**
```typescript
{
  uploadUrl: string;      // Pre-signed S3 PUT URL (expires in 5 min)
  publicUrl: string;      // Public CDN URL after upload
}
```

**Example:**
```typescript
// 1. Get upload URL
const { uploadUrl, publicUrl } = await trpc.upload.getUploadUrl.mutate({
  fileName: file.name,
  fileType: file.type
});

// 2. Upload directly to S3
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});

// 3. Use publicUrl in listing
await trpc.listing.create.mutate({
  // ...
  photos: [publicUrl]
});
```

---

## Admin API

### GET /admin.getPendingListings

Get listings pending review.

**Auth Required:** Yes (admin)

**Input:**
```typescript
{
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
{
  listings: Array<{
    id: string;
    title: string;
    seller: { email: string };
    createdAt: Date;
  }>;
  total: number;
}
```

### POST /admin.approveListing

Approve pending listing.

**Auth Required:** Yes (admin)

**Input:**
```typescript
{
  listingId: string;
}
```

**Response:**
```typescript
{
  id: string;
  status: "PUBLISHED";
}
```

### POST /admin.rejectListing

Reject pending listing.

**Auth Required:** Yes (admin)

**Input:**
```typescript
{
  listingId: string;
  reason: string;
}
```

**Response:**
```typescript
{
  id: string;
  status: "CANCELLED";
  rejectionReason: string;
}
```

### POST /admin.suspendUser

Suspend user account.

**Auth Required:** Yes (admin)

**Input:**
```typescript
{
  userId: string;
  reason: string;
  duration?: number;  // Days, null = indefinite
}
```

**Response:**
```typescript
{
  userId: string;
  suspended: true;
  suspendedUntil: Date | null;
}
```

### GET /admin.getStatistics

Get platform statistics.

**Auth Required:** Yes (admin)

**Response:**
```typescript
{
  totalUsers: number;
  totalListings: number;
  totalReservations: number;
  totalRevenue: number;
  activeListings: number;
  pendingReview: number;
}
```

---

## User API

### GET /user.getStats

Get current user statistics.

**Auth Required:** Yes

**Response:**
```typescript
{
  totalListings: number;
  activeListings: number;
  totalSales: number;
  totalPurchases: number;
  recentTransactions: Array<{
    id: string;
    listing: { title: string };
    totalPrice: number;
    status: string;
    createdAt: Date;
  }>;
}
```

### PUT /user.updateProfile

Update user profile.

**Auth Required:** Yes

**Input:**
```typescript
{
  email?: string;
  phone?: string;
  businessName?: string;
  accountType?: "INDIVIDUAL" | "BUSINESS";
}
```

**Response:** Updated user object

### GET /user.getPreferences

Get user notification preferences.

**Auth Required:** Yes

**Response:**
```typescript
{
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  language: "en" | "fr" | "es";
}
```

### PUT /user.updatePreferences

Update notification preferences.

**Auth Required:** Yes

**Input:**
```typescript
{
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  language?: "en" | "fr" | "es";
}
```

**Response:** Updated preferences object

---

## Error Handling

All tRPC endpoints return typed errors with these fields:

```typescript
{
  code:
    | "UNAUTHORIZED"          // 401: Not authenticated
    | "FORBIDDEN"             // 403: Authenticated but not authorized
    | "NOT_FOUND"            // 404: Resource not found
    | "BAD_REQUEST"          // 400: Invalid input
    | "CONFLICT"             // 409: Resource conflict
    | "INTERNAL_SERVER_ERROR" // 500: Server error
  message: string;            // Human-readable error message
  data?: {                    // Optional error details
    zodError?: ZodError;      // Validation errors
    field?: string;           // Field that caused error
  }
}
```

**Example Error Handling:**
```typescript
try {
  const listing = await trpc.listing.create.mutate({ /* ... */ });
} catch (error) {
  if (error.data?.code === "UNAUTHORIZED") {
    // Redirect to login
    router.push("/auth/signin");
  } else if (error.data?.code === "BAD_REQUEST") {
    // Show validation errors
    const zodError = error.data.zodError;
    // Display field errors
  } else {
    // Generic error handling
    toast.error(error.message);
  }
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Listings (read) | 100 requests | 1 minute |
| Listings (write) | 20 requests | 1 minute |
| Reservations | 30 requests | 1 minute |
| Payments | 10 requests | 1 minute |
| Admin | 50 requests | 1 minute |

Rate limit headers:
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Timestamp when limit resets

---

## Webhooks

### Stripe Webhooks

**Endpoint:** `POST /api/webhooks/stripe`

**Events:**
- `payment_intent.succeeded`: Confirm reservation
- `payment_intent.payment_failed`: Send failure notification
- `charge.refunded`: Update reservation status

**Verification:**
Uses Stripe webhook secret to verify authenticity.

---

## Best Practices

1. **Type Safety**: Always use generated tRPC types
2. **Error Handling**: Catch and handle all error codes
3. **Loading States**: Show loading UI during mutations
4. **Optimistic Updates**: Use tRPC's optimistic update features
5. **Caching**: Configure appropriate cache times for queries
6. **Pagination**: Use offset/limit for large result sets
7. **Validation**: Let Zod schemas validate input automatically

---

## SDK Usage Examples

### React Client

```typescript
import { api } from "~/trpc/react";

function ListingSearch() {
  const [postalCode, setPostalCode] = useState("M5H 2N2");

  const { data, isLoading } = api.listing.search.useQuery({
    postalCode,
    radiusKm: 10
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.listings.map(({ listing, distance }) => (
        <ListingCard key={listing.id} listing={listing} distance={distance} />
      ))}
    </div>
  );
}
```

### Next.js Server Components

```typescript
import { api } from "~/trpc/server";

export default async function ListingPage({ params }: { params: { id: string } }) {
  const listing = await api.listing.getById({ id: params.id });

  return <ListingDetail listing={listing} />;
}
```

### React Native

```typescript
import { api } from "~/utils/api";

function useListingSearch(postalCode: string) {
  return api.listing.search.useQuery({
    postalCode,
    radiusKm: 10
  });
}
```

---

**API Version:** 1.0.0
**Last Updated:** 2026-01-15
**Support:** dev@vendgros.com
