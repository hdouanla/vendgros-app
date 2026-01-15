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
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { user } from "./schema";

// ============================================================================
// ENUMS FOR EXTENSIONS
// ============================================================================

export const webhookEventEnum = pgEnum("webhook_event", [
  "listing.created",
  "listing.updated",
  "listing.published",
  "reservation.created",
  "reservation.confirmed",
  "reservation.completed",
  "reservation.cancelled",
  "rating.created",
  "message.received",
]);

export const currencyEnum = pgEnum("currency", ["CAD", "USD", "EUR", "GBP", "MXN"]);

export const countryEnum = pgEnum("country", ["CA", "US", "GB", "MX", "EU"]);

// ============================================================================
// API INTEGRATION TABLES
// ============================================================================

export const apiKey = pgTable(
  "api_key",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    name: t.varchar({ length: 100 }).notNull(), // User-friendly name
    keyHash: t.text().notNull().unique(), // Hashed API key
    keyPrefix: t.varchar({ length: 8 }).notNull(), // First 8 chars for display

    scopes: t.text().array().notNull().default(sql`ARRAY[]::text[]`), // Permissions
    rateLimit: t.integer().notNull().default(1000), // Requests per hour

    isActive: t.boolean().notNull().default(true),
    lastUsedAt: t.timestamp(),
    expiresAt: t.timestamp(),

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => sql`now()`),
  }),
  (table) => ({
    userIdx: index("api_key_user_idx").on(table.userId),
    keyHashIdx: index("api_key_hash_idx").on(table.keyHash),
  }),
);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  user: one(user, {
    fields: [apiKey.userId],
    references: [user.id],
  }),
}));

export const webhook = pgTable(
  "webhook",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    url: t.text().notNull(),
    events: t.text().array().notNull(), // Array of webhook_event enum values
    secret: t.text().notNull(), // For HMAC signature verification

    isActive: t.boolean().notNull().default(true),
    failureCount: t.integer().notNull().default(0),
    lastTriggeredAt: t.timestamp(),
    lastFailureAt: t.timestamp(),

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => sql`now()`),
  }),
  (table) => ({
    userIdx: index("webhook_user_idx").on(table.userId),
  }),
);

export const webhookRelations = relations(webhook, ({ one, many }) => ({
  user: one(user, {
    fields: [webhook.userId],
    references: [user.id],
  }),
  deliveries: many(webhookDelivery),
}));

export const webhookDelivery = pgTable(
  "webhook_delivery",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    webhookId: t
      .text()
      .notNull()
      .references(() => webhook.id, { onDelete: "cascade" }),

    event: t.varchar({ length: 50 }).notNull(),
    payload: t.text().notNull(), // JSON string

    status: t.varchar({ length: 20 }).notNull(), // success, failed, pending
    responseCode: t.integer(),
    responseBody: t.text(),
    errorMessage: t.text(),

    attempts: t.integer().notNull().default(1),
    nextRetryAt: t.timestamp(),

    createdAt: t.timestamp().notNull().defaultNow(),
    deliveredAt: t.timestamp(),
  }),
  (table) => ({
    webhookIdx: index("webhook_delivery_webhook_idx").on(table.webhookId),
    statusIdx: index("webhook_delivery_status_idx").on(table.status),
    createdAtIdx: index("webhook_delivery_created_at_idx").on(table.createdAt),
  }),
);

export const webhookDeliveryRelations = relations(webhookDelivery, ({ one }) => ({
  webhook: one(webhook, {
    fields: [webhookDelivery.webhookId],
    references: [webhook.id],
  }),
}));

// ============================================================================
// WHITE-LABEL TENANT TABLES
// ============================================================================

export const tenant = pgTable(
  "tenant",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),

    name: t.varchar({ length: 100 }).notNull(),
    slug: t.varchar({ length: 50 }).notNull().unique(), // For subdomain
    domain: t.varchar({ length: 255 }).unique(), // Custom domain

    // Branding
    logoUrl: t.text(),
    primaryColor: t.varchar({ length: 7 }).default("#10b981"), // Hex color
    secondaryColor: t.varchar({ length: 7 }).default("#3b82f6"),

    // International Configuration
    country: countryEnum("country").notNull().default("CA"),
    currency: currencyEnum("currency").notNull().default("CAD"),
    locale: t.varchar({ length: 10 }).notNull().default("en"), // en, fr, es, etc.
    timezone: t.varchar({ length: 50 }).notNull().default("America/Toronto"),

    // Configuration
    isActive: t.boolean().notNull().default(true),
    features: t.text().array().default(sql`ARRAY[]::text[]`), // Enabled features
    config: t.text(), // JSON string for additional config

    // Billing
    plan: t.varchar({ length: 50 }).notNull().default("free"), // free, basic, pro, enterprise
    monthlyFee: t.doublePrecision().notNull().default(0),

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => sql`now()`),
  }),
  (table) => ({
    slugIdx: index("tenant_slug_idx").on(table.slug),
    domainIdx: index("tenant_domain_idx").on(table.domain),
    countryIdx: index("tenant_country_idx").on(table.country),
  }),
);

export const tenantRelations = relations(tenant, ({ many }) => ({
  users: many(user),
}));

// ============================================================================
// USER REPORTING SYSTEM
// ============================================================================

export const reportTypeEnum = pgEnum("report_type", [
  "USER_FRAUD",
  "USER_HARASSMENT",
  "USER_SPAM",
  "LISTING_FRAUD",
  "LISTING_INAPPROPRIATE",
  "LISTING_PROHIBITED",
  "MESSAGE_HARASSMENT",
  "MESSAGE_SPAM",
  "TRANSACTION_ISSUE",
  "OTHER",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "PENDING",
  "UNDER_REVIEW",
  "RESOLVED",
  "DISMISSED",
]);

export const userReport = pgTable(
  "user_report",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    reporterId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reportedUserId: t
      .text()
      .references(() => user.id, { onDelete: "cascade" }),

    reportType: reportTypeEnum("report_type").notNull(),
    listingId: t.text(),
    messageId: t.text(),
    reservationId: t.text(),

    description: t.text().notNull(),
    evidence: t.text().array().default(sql`ARRAY[]::text[]`),

    status: reportStatusEnum("status").notNull().default("PENDING"),
    priority: t.varchar({ length: 20 }).notNull().default("medium"),
    assignedTo: t.text().references(() => user.id),
    moderatorNotes: t.text(),
    resolution: t.text(),

    createdAt: t.timestamp().notNull().defaultNow(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => sql`now()`),
    resolvedAt: t.timestamp(),
  }),
  (table) => ({
    reporterIdx: index("user_report_reporter_idx").on(table.reporterId),
    reportedUserIdx: index("user_report_reported_user_idx").on(table.reportedUserId),
    statusIdx: index("user_report_status_idx").on(table.status),
    typeIdx: index("user_report_type_idx").on(table.reportType),
    priorityIdx: index("user_report_priority_idx").on(table.priority),
    createdAtIdx: index("user_report_created_at_idx").on(table.createdAt),
  }),
);

export const userReportRelations = relations(userReport, ({ one }) => ({
  reporter: one(user, {
    fields: [userReport.reporterId],
    references: [user.id],
    relationName: "reporter",
  }),
  reportedUser: one(user, {
    fields: [userReport.reportedUserId],
    references: [user.id],
    relationName: "reportedUser",
  }),
  assignedModerator: one(user, {
    fields: [userReport.assignedTo],
    references: [user.id],
    relationName: "assignedModerator",
  }),
}));

// ============================================================================
// LISTING EDIT HISTORY
// ============================================================================

export const listingEdit = pgTable(
  "listing_edit",
  (t) => ({
    id: t.text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    listingId: t.text().notNull(),
    editorId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    changes: t.text().notNull(),
    previousValues: t.text().notNull(),
    newValues: t.text().notNull(),

    reason: t.varchar({ length: 500 }),
    ipAddress: t.varchar({ length: 45 }),
    userAgent: t.text(),

    createdAt: t.timestamp().notNull().defaultNow(),
  }),
  (table) => ({
    listingIdx: index("listing_edit_listing_idx").on(table.listingId),
    editorIdx: index("listing_edit_editor_idx").on(table.editorId),
    createdAtIdx: index("listing_edit_created_at_idx").on(table.createdAt),
  }),
);

export const listingEditRelations = relations(listingEdit, ({ one }) => ({
  editor: one(user, {
    fields: [listingEdit.editorId],
    references: [user.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const insertApiKeySchema = createInsertSchema(apiKey);
export const selectApiKeySchema = createSelectSchema(apiKey);

export const insertWebhookSchema = createInsertSchema(webhook);
export const selectWebhookSchema = createSelectSchema(webhook);

export const insertWebhookDeliverySchema = createInsertSchema(webhookDelivery);
export const selectWebhookDeliverySchema = createSelectSchema(webhookDelivery);

export const insertTenantSchema = createInsertSchema(tenant);
export const selectTenantSchema = createSelectSchema(tenant);

export const insertUserReportSchema = createInsertSchema(userReport);
export const selectUserReportSchema = createSelectSchema(userReport);

export const insertListingEditSchema = createInsertSchema(listingEdit);
export const selectListingEditSchema = createSelectSchema(listingEdit);
