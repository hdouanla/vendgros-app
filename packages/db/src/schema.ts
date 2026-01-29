import { relations, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ============================================================================
// ENUMS
// ============================================================================

// DEPRECATED: userType is being phased out
// - Use `isAdmin` boolean for admin privileges
// - Use `verificationBadge` for trust levels
// Keeping for backward compatibility during migration
export const userTypeEnum = pgEnum("user_type", [
  "BUYER",
  "SELLER_INDIVIDUAL",
  "SELLER_MERCHANT",
  "ADMIN",
]);

// Rating type - indicates the role the rated user was playing in the transaction
export const ratingTypeEnum = pgEnum("rating_type", [
  "AS_BUYER",  // Rating received when user was the buyer
  "AS_SELLER", // Rating received when user was the seller
]);

export const accountStatusEnum = pgEnum("account_status", [
  "ACTIVE",
  "SUSPENDED",
  "BANNED",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "RESERVED",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
]);

export const verificationBadgeEnum = pgEnum("verification_badge", [
  "NONE",
  "VERIFIED",
  "TRUSTED",
  "PREMIUM",
]);

export const bulkImportStatusEnum = pgEnum("bulk_import_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "PARTIAL",
]);

// ============================================================================
// USERS TABLE
// ============================================================================

export const user = pgTable(
  "user",
  (t) => ({
    id: t.text().primaryKey(),
    name: t.text().notNull(),
    email: t.text().notNull().unique(),
    phone: t.text(),
    passwordHash: t.text(),

    emailVerified: t.boolean().notNull().default(false),
    phoneVerified: t.boolean().notNull().default(false),
    accountStatus: accountStatusEnum().notNull().default("ACTIVE"),

    // DEPRECATED: Use isAdmin for admin privileges, verificationBadge for trust
    userType: userTypeEnum().notNull().default("BUYER"),

    // Admin privileges - replaces userType === "ADMIN" check
    isAdmin: t.boolean().notNull().default(false),

    languagePreference: t.varchar({ length: 5 }).notNull().default("en"),

    // DEPRECATED: Use separate buyer/seller ratings instead
    ratingAverage: t.doublePrecision().default(0),
    ratingCount: t.integer().notNull().default(0),

    // Separate ratings for buyer and seller roles
    buyerRatingAverage: t.doublePrecision().default(0),
    buyerRatingCount: t.integer().notNull().default(0),
    sellerRatingAverage: t.doublePrecision().default(0),
    sellerRatingCount: t.integer().notNull().default(0),

    moderationNotes: t.text(),

    // Verification badges
    verificationBadge: verificationBadgeEnum().notNull().default("NONE"),
    identityVerified: t.boolean().notNull().default(false),
    identityVerificationMethod: t.varchar({ length: 50 }), // e.g., "government_id", "business_license"
    identityVerificationNotes: t.text(),

    // Trust & Safety
    fraudRiskScore: t.doublePrecision(), // 0-1, higher = more risky
    fraudFlags: t.text().array().default(sql`ARRAY[]::text[]`),
    lastFraudCheckAt: t.timestamp(),
    trustScore: t.integer(), // 0-100
    behaviorFlags: t.text().array().default(sql`ARRAY[]::text[]`),
    lastBehaviorCheckAt: t.timestamp(),

    // White-Label Multi-Tenant
    tenantId: t.text(), // Optional tenant association for white-label

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    emailIdx: index("user_email_idx").on(table.email),
    phoneIdx: index("user_phone_idx").on(table.phone),
    accountStatusIdx: index("user_account_status_idx").on(table.accountStatus),
  }),
);

export const userRelations = relations(user, ({ many }) => ({
  listingsAsSeller: many(listing),
  reservationsAsBuyer: many(reservation),
  ratingsGiven: many(rating, { relationName: "raterRatings" }),
  ratingsReceived: many(rating, { relationName: "ratedRatings" }),
  conversationsAsBuyer: many(conversation, { relationName: "buyerConversations" }),
  conversationsAsSeller: many(conversation, { relationName: "sellerConversations" }),
  messagesSent: many(message),
  likedListings: many(listingLike),
  favoritedListings: many(listingFavorite),
}));

// ============================================================================
// AUTH TABLES (NextAuth compatible)
// ============================================================================

export const session = pgTable("session", (t) => ({
  id: t.text().primaryKey(),
  expiresAt: t.timestamp().notNull(),
  token: t.text().notNull().unique(),
  createdAt: t.timestamp().notNull().defaultNow(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => sql`now()`),
  ipAddress: t.text(),
  userAgent: t.text(),
  userId: t
    .text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
}));

export const account = pgTable("account", (t) => ({
  id: t.text().primaryKey(),
  accountId: t.text().notNull(),
  providerId: t.text().notNull(),
  userId: t
    .text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: t.text(),
  refreshToken: t.text(),
  idToken: t.text(),
  accessTokenExpiresAt: t.timestamp(),
  refreshTokenExpiresAt: t.timestamp(),
  scope: t.text(),
  password: t.text(),
  createdAt: t.timestamp().notNull().defaultNow(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => sql`now()`),
}));

export const verification = pgTable("verification", (t) => ({
  id: t.text().primaryKey(),
  identifier: t.text().notNull(),
  value: t.text().notNull(),
  expiresAt: t.timestamp().notNull(),
  createdAt: t.timestamp().defaultNow(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .$onUpdateFn(() => sql`now()`),
}));

// ============================================================================
// LISTINGS TABLE
// ============================================================================

export const listing = pgTable(
  "listing",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    sellerId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    title: t.varchar({ length: 200 }).notNull(),
    description: t.text().notNull(),
    category: t.varchar({ length: 100 }).notNull(),
    photos: t.text().array().notNull().default(sql`ARRAY[]::text[]`),

    pricePerPiece: t.doublePrecision().notNull(),
    quantityTotal: t.integer().notNull(),
    quantityAvailable: t.integer().notNull(),
    minPerBuyer: t.integer(), // Optional minimum per reservation
    maxPerBuyer: t.integer(), // Optional purchase limit

    pickupAddress: t.text().notNull(),
    pickupInstructions: t.text(),
    postalCode: t.varchar({ length: 10 }), // Store postal code for prefilling in edit mode
    // PostGIS geometry column for spatial queries
    location: t.text(), // POINT(longitude latitude) - will use PostGIS
    latitude: t.doublePrecision().notNull(),
    longitude: t.doublePrecision().notNull(),

    status: listingStatusEnum().notNull().default("DRAFT"),
    isActive: t.boolean().notNull().default(true), // Seller can deactivate listing
    moderationNotes: t.text(),
    publishedAt: t.timestamp(),

    // Scheduled publishing
    scheduledPublishAt: t.timestamp(), // When to auto-publish
    autoPublishEnabled: t.boolean().notNull().default(false),

    // AI Moderation fields
    aiModerationScore: t.doublePrecision(), // 0-1 confidence score
    aiModerationFlags: t.text().array().default(sql`ARRAY[]::text[]`),
    aiModeratedAt: t.timestamp(),

    // Product specifications (optional)
    weightKg: t.doublePrecision(), // Weight in kilograms
    lengthCm: t.doublePrecision(), // Length in centimeters
    widthCm: t.doublePrecision(), // Width in centimeters
    heightCm: t.doublePrecision(), // Height in centimeters

    // Delivery options
    canDeliver: t.boolean().notNull().default(false),
    deliveryRadiusKm: t.doublePrecision(), // Delivery radius in km from listing location

    // View tracking
    viewCount: t.integer().notNull().default(0),

    // Engagement tracking
    likesCount: t.integer().notNull().default(0),

    // Featured listing (admin-controlled)
    isFeatured: t.boolean().notNull().default(false),

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    sellerIdx: index("listing_seller_idx").on(table.sellerId),
    statusIdx: index("listing_status_idx").on(table.status),
    categoryIdx: index("listing_category_idx").on(table.category),
    coordsIdx: index("listing_coords_idx").on(table.latitude, table.longitude),
    featuredIdx: index("listing_featured_idx").on(table.isFeatured),
  }),
);

export const listingRelations = relations(listing, ({ one, many }) => ({
  seller: one(user, {
    fields: [listing.sellerId],
    references: [user.id],
  }),
  reservations: many(reservation),
  likes: many(listingLike),
  favorites: many(listingFavorite),
}));

// ============================================================================
// LISTING LIKES TABLE
// ============================================================================

export const listingLike = pgTable(
  "listing_like",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    listingId: t.text().notNull().references(() => listing.id, { onDelete: "cascade" }),
    userId: t.text().notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: t.timestamp().notNull().defaultNow(),
  }),
  (table) => ({
    userListingUnique: unique("listing_like_user_listing_unique").on(table.userId, table.listingId),
    listingIdx: index("listing_like_listing_idx").on(table.listingId),
  }),
);

export const listingLikeRelations = relations(listingLike, ({ one }) => ({
  listing: one(listing, {
    fields: [listingLike.listingId],
    references: [listing.id],
  }),
  user: one(user, {
    fields: [listingLike.userId],
    references: [user.id],
  }),
}));

// ============================================================================
// LISTING FAVORITES TABLE
// ============================================================================

export const listingFavorite = pgTable(
  "listing_favorite",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    listingId: t.text().notNull().references(() => listing.id, { onDelete: "cascade" }),
    userId: t.text().notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: t.timestamp().notNull().defaultNow(),
  }),
  (table) => ({
    userListingUnique: unique("listing_favorite_user_listing_unique").on(table.userId, table.listingId),
    listingIdx: index("listing_favorite_listing_idx").on(table.listingId),
  }),
);

export const listingFavoriteRelations = relations(listingFavorite, ({ one }) => ({
  listing: one(listing, {
    fields: [listingFavorite.listingId],
    references: [listing.id],
  }),
  user: one(user, {
    fields: [listingFavorite.userId],
    references: [user.id],
  }),
}));

// ============================================================================
// RESERVATIONS TABLE
// ============================================================================

export const reservation = pgTable(
  "reservation",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    listingId: t
      .text()
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    buyerId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    quantityReserved: t.integer().notNull(),
    totalPrice: t.doublePrecision().notNull(),
    depositAmount: t.doublePrecision().notNull(), // 5% of total

    qrCodeHash: t.text().notNull().unique(),
    verificationCode: t.varchar({ length: 6 }).notNull().unique(), // 6-digit alphanumeric

    status: reservationStatusEnum().notNull().default("PENDING"),

    stripePaymentIntentId: t.text(),

    expiresAt: t.timestamp().notNull(),
    completedAt: t.timestamp(),

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    listingIdx: index("reservation_listing_idx").on(table.listingId),
    buyerIdx: index("reservation_buyer_idx").on(table.buyerId),
    statusIdx: index("reservation_status_idx").on(table.status),
    qrCodeHashIdx: index("reservation_qr_code_hash_idx").on(table.qrCodeHash),
    verificationCodeIdx: index("reservation_verification_code_idx").on(
      table.verificationCode,
    ),
  }),
);

export const reservationRelations = relations(reservation, ({ one, many }) => ({
  listing: one(listing, {
    fields: [reservation.listingId],
    references: [listing.id],
  }),
  buyer: one(user, {
    fields: [reservation.buyerId],
    references: [user.id],
  }),
  ratings: many(rating),
  conversation: one(conversation),
}));

// ============================================================================
// RATINGS TABLE
// ============================================================================

export const rating = pgTable(
  "rating",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    reservationId: t
      .text()
      .notNull()
      .references(() => reservation.id, { onDelete: "cascade" }),

    raterId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ratedId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Type of rating - was the rated user acting as buyer or seller?
    ratingType: ratingTypeEnum().notNull(),

    score: t.integer().notNull(), // 1-5
    comment: t.text(),
    isVisible: t.boolean().notNull().default(false), // Hidden until both parties rate

    // Review authenticity
    authenticityScore: t.doublePrecision(), // 0-1 confidence in authenticity
    authenticityFlags: t.text().array().default(sql`ARRAY[]::text[]`),
    aiGenerated: t.boolean(),
    lastAuthenticityCheckAt: t.timestamp(),

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    reservationRaterIdx: index("rating_reservation_rater_idx").on(
      table.reservationId,
      table.raterId,
    ),
    raterIdx: index("rating_rater_idx").on(table.raterId),
    ratedIdx: index("rating_rated_idx").on(table.ratedId),
    ratedTypeIdx: index("rating_rated_type_idx").on(table.ratedId, table.ratingType),
  }),
);

export const ratingRelations = relations(rating, ({ one }) => ({
  reservation: one(reservation, {
    fields: [rating.reservationId],
    references: [reservation.id],
  }),
  rater: one(user, {
    fields: [rating.raterId],
    references: [user.id],
    relationName: "raterRatings",
  }),
  rated: one(user, {
    fields: [rating.ratedId],
    references: [user.id],
    relationName: "ratedRatings",
  }),
}));

// ============================================================================
// MESSAGING TABLES
// ============================================================================

export const conversation = pgTable(
  "conversation",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    listingId: t
      .text()
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    buyerId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sellerId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reservationId: t
      .text()
      .unique() // 1:1 relationship
      .references(() => reservation.id, { onDelete: "cascade" }),

    // Last message metadata (for list view)
    lastMessageAt: t.timestamp(),
    lastMessageText: t.text(),
    lastMessageSenderId: t.text(),

    // Read receipts
    buyerLastReadAt: t.timestamp(),
    sellerLastReadAt: t.timestamp(),

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    listingIdx: index("conversation_listing_idx").on(table.listingId),
    buyerIdx: index("conversation_buyer_idx").on(table.buyerId),
    sellerIdx: index("conversation_seller_idx").on(table.sellerId),
    buyerSellerListingIdx: index("conversation_buyer_seller_listing_idx").on(
      table.buyerId,
      table.sellerId,
      table.listingId,
    ),
    reservationIdx: index("conversation_reservation_idx").on(table.reservationId),
  }),
);

export const conversationRelations = relations(conversation, ({ one, many }) => ({
  listing: one(listing, {
    fields: [conversation.listingId],
    references: [listing.id],
  }),
  buyer: one(user, {
    fields: [conversation.buyerId],
    references: [user.id],
    relationName: "buyerConversations",
  }),
  seller: one(user, {
    fields: [conversation.sellerId],
    references: [user.id],
    relationName: "sellerConversations",
  }),
  reservation: one(reservation, {
    fields: [conversation.reservationId],
    references: [reservation.id],
  }),
  messages: many(message),
}));

export const message = pgTable(
  "message",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    conversationId: t
      .text()
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    senderId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    content: t.text().notNull(),
    isEncrypted: t.boolean().notNull().default(false),

    // Attachments (images)
    attachments: t.text().array().default(sql`ARRAY[]::text[]`),

    // Message status
    isRead: t.boolean().notNull().default(false),
    readAt: t.timestamp(),

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    conversationIdx: index("message_conversation_idx").on(table.conversationId),
    senderIdx: index("message_sender_idx").on(table.senderId),
    createdAtIdx: index("message_created_at_idx").on(table.createdAt),
  }),
);

export const messageRelations = relations(message, ({ one }) => ({
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
  sender: one(user, {
    fields: [message.senderId],
    references: [user.id],
  }),
}));

// ============================================================================
// BULK IMPORT TABLE
// ============================================================================

export const bulkImport = pgTable(
  "bulk_import",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Import metadata
    fileName: t.varchar({ length: 255 }),
    totalRows: t.integer().notNull(),
    successCount: t.integer().notNull().default(0),
    failureCount: t.integer().notNull().default(0),

    // Status
    status: bulkImportStatusEnum().notNull().default("PENDING"),

    // Results data (JSON)
    results: t.text(), // JSON string of ImportResult[]
    errorMessage: t.text(),

    // Publishing
    publishImmediately: t.boolean().notNull().default(false),

    // Timestamps
    startedAt: t.timestamp(),
    completedAt: t.timestamp(),
    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  }),
  (table) => ({
    userIdx: index("bulk_import_user_idx").on(table.userId),
    statusIdx: index("bulk_import_status_idx").on(table.status),
    createdAtIdx: index("bulk_import_created_at_idx").on(table.createdAt),
  }),
);

export const bulkImportRelations = relations(bulkImport, ({ one }) => ({
  user: one(user, {
    fields: [bulkImport.userId],
    references: [user.id],
  }),
}));

// ============================================================================
// POSTAL CODES TABLE (Canadian)
// ============================================================================

export const postalCode = pgTable(
  "postal_code",
  (t) => ({
    code: t.varchar({ length: 7 }).primaryKey(), // e.g., "M5H 2N2"
    countryCode: t.varchar({ length: 2 }).notNull().default("CA"),
    city: t.varchar({ length: 100 }).notNull(),
    provinceName: t.varchar({ length: 100 }), // Full name: "Ontario"
    province: t.varchar({ length: 2 }).notNull(), // Code: "ON"
    timezone: t.varchar({ length: 20 }), // e.g., "GMT -05:00"
    daylightSaving: t.boolean(), // Observes DST
    latitude: t.doublePrecision().notNull(),
    longitude: t.doublePrecision().notNull(),
    // PostGIS geometry column
    location: t.text(), // POINT(longitude latitude)
  }),
  (table) => ({
    coordsIdx: index("postal_code_coords_idx").on(
      table.latitude,
      table.longitude,
    ),
  }),
);

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// User schemas
export const insertUserSchema = createInsertSchema(user, {
  email: z.string().email(),
  phone: z.string().regex(/^\+1[2-9]\d{9}$/), // Canadian phone format
  languagePreference: z.enum(["en", "fr", "es"]),
});

export const selectUserSchema = createSelectSchema(user);

// Listing schemas
export const insertListingSchema = createInsertSchema(listing, {
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(5000),
  // Photos can be relative paths or full URLs (for backwards compatibility)
  photos: z.array(z.string().min(1)).min(1).max(10),
  pricePerPiece: z.number().positive(),
  quantityTotal: z.number().int().positive(),
  minPerBuyer: z.number().int().positive().optional(),
  maxPerBuyer: z.number().int().positive().optional(),
  // Product specifications
  weightKg: z.number().positive().optional(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  // Delivery options
  canDeliver: z.boolean().optional(),
  deliveryRadiusKm: z.number().positive().optional(),
});

export const selectListingSchema = createSelectSchema(listing);

// Reservation schemas
export const insertReservationSchema = createInsertSchema(reservation, {
  quantityReserved: z.number().int().positive(),
  totalPrice: z.number().positive(),
  depositAmount: z.number().positive(),
});

export const selectReservationSchema = createSelectSchema(reservation);

// Rating schemas
export const insertRatingSchema = createInsertSchema(rating, {
  score: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  ratingType: z.enum(["AS_BUYER", "AS_SELLER"]),
});

export const selectRatingSchema = createSelectSchema(rating);

// Postal code schemas
export const insertPostalCodeSchema = createInsertSchema(postalCode, {
  code: z.string().regex(/^[A-Z]\d[A-Z] \d[A-Z]\d$/),
  province: z.string().length(2),
});

export const selectPostalCodeSchema = createSelectSchema(postalCode);

// Conversation schemas
export const insertConversationSchema = createInsertSchema(conversation);
export const selectConversationSchema = createSelectSchema(conversation);

// Message schemas
export const insertMessageSchema = createInsertSchema(message, {
  content: z.string().min(1).max(5000),
  // Attachments can be relative paths or full URLs (for backwards compatibility)
  attachments: z.array(z.string().min(1)).max(5).optional(),
});
export const selectMessageSchema = createSelectSchema(message);

// Bulk import schemas
export const insertBulkImportSchema = createInsertSchema(bulkImport, {
  totalRows: z.number().int().positive(),
  successCount: z.number().int().min(0),
  failureCount: z.number().int().min(0),
});
export const selectBulkImportSchema = createSelectSchema(bulkImport);

// Listing like schemas
export const insertListingLikeSchema = createInsertSchema(listingLike);
export const selectListingLikeSchema = createSelectSchema(listingLike);

// Listing favorite schemas
export const insertListingFavoriteSchema = createInsertSchema(listingFavorite);
export const selectListingFavoriteSchema = createSelectSchema(listingFavorite);

// Export all
export * from "./auth-schema";
