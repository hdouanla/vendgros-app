import crypto from "crypto";
import { z } from "zod/v4";
import { and, eq, desc, lte } from "@acme/db";

import {
  apiKey,
  webhook,
  webhookDelivery,
} from "@acme/db/schema-extensions";

import { createTRPCRouter, protectedProcedure } from "../trpc";

/**
 * Generate a secure API key
 */
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `vg_${crypto.randomBytes(32).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const prefix = key.substring(0, 8);
  return { key, hash, prefix };
}

/**
 * Generate webhook secret
 */
function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

export const apiIntegrationsRouter = createTRPCRouter({
  // ============================================================================
  // API KEY MANAGEMENT
  // ============================================================================

  /**
   * Create a new API key
   */
  createApiKey: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        scopes: z.array(z.string()).min(1),
        rateLimit: z.number().int().min(100).max(10000).default(1000),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { key, hash, prefix } = generateApiKey();

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const [newApiKey] = await ctx.db
        .insert(apiKey)
        .values({
          userId: ctx.session.user.id,
          name: input.name,
          keyHash: hash,
          keyPrefix: prefix,
          scopes: input.scopes,
          rateLimit: input.rateLimit,
          expiresAt,
        })
        .returning();

      // Return the key only once (never stored in plain text)
      return {
        apiKey: newApiKey,
        key, // IMPORTANT: Only shown once!
        message:
          "API key created successfully. Make sure to copy it now - you won't be able to see it again!",
      };
    }),

  /**
   * List user's API keys
   */
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const keys = await ctx.db.query.apiKey.findMany({
      where: (keys, { eq }) => eq(keys.userId, ctx.session.user.id),
      orderBy: (keys, { desc }) => [desc(keys.createdAt)],
    });

    return keys.map((k) => ({
      ...k,
      // Don't return the hash
      keyHash: undefined,
    }));
  }),

  /**
   * Revoke (delete) an API key
   */
  revokeApiKey: protectedProcedure
    .input(
      z.object({
        keyId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const key = await ctx.db.query.apiKey.findFirst({
        where: (keys, { and, eq }) =>
          and(eq(keys.id, input.keyId), eq(keys.userId, ctx.session.user.id)),
      });

      if (!key) {
        throw new Error("API key not found or you don't have permission");
      }

      await ctx.db.delete(apiKey).where(eq(apiKey.id, input.keyId));

      return {
        success: true,
        message: "API key revoked successfully",
      };
    }),

  /**
   * Update API key status or rate limit
   */
  updateApiKey: protectedProcedure
    .input(
      z.object({
        keyId: z.string(),
        isActive: z.boolean().optional(),
        rateLimit: z.number().int().min(100).max(10000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const key = await ctx.db.query.apiKey.findFirst({
        where: (keys, { and, eq }) =>
          and(eq(keys.id, input.keyId), eq(keys.userId, ctx.session.user.id)),
      });

      if (!key) {
        throw new Error("API key not found or you don't have permission");
      }

      const updates: any = {};
      if (input.isActive !== undefined) updates.isActive = input.isActive;
      if (input.rateLimit !== undefined) updates.rateLimit = input.rateLimit;

      const [updated] = await ctx.db
        .update(apiKey)
        .set(updates)
        .where(eq(apiKey.id, input.keyId))
        .returning();

      return {
        success: true,
        apiKey: updated,
      };
    }),

  // ============================================================================
  // WEBHOOK MANAGEMENT
  // ============================================================================

  /**
   * Create a new webhook
   */
  createWebhook: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        events: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const secret = generateWebhookSecret();

      const [newWebhook] = await ctx.db
        .insert(webhook)
        .values({
          userId: ctx.session.user.id,
          url: input.url,
          events: input.events,
          secret,
        })
        .returning();

      return {
        webhook: newWebhook,
        secret, // Return secret for user to configure
        message: "Webhook created successfully. Use the secret to verify webhook signatures.",
      };
    }),

  /**
   * List user's webhooks
   */
  listWebhooks: protectedProcedure.query(async ({ ctx }) => {
    const webhooks = await ctx.db.query.webhook.findMany({
      where: (webhooks, { eq }) => eq(webhooks.userId, ctx.session.user.id),
      orderBy: (webhooks, { desc }) => [desc(webhooks.createdAt)],
    });

    return webhooks.map((w) => ({
      ...w,
      // Don't return the full secret
      secret: `${w.secret.substring(0, 12)}...`,
    }));
  }),

  /**
   * Delete a webhook
   */
  deleteWebhook: protectedProcedure
    .input(
      z.object({
        webhookId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const webhookData = await ctx.db.query.webhook.findFirst({
        where: (webhooks, { and, eq }) =>
          and(
            eq(webhooks.id, input.webhookId),
            eq(webhooks.userId, ctx.session.user.id),
          ),
      });

      if (!webhookData) {
        throw new Error("Webhook not found or you don't have permission");
      }

      await ctx.db.delete(webhook).where(eq(webhook.id, input.webhookId));

      return {
        success: true,
        message: "Webhook deleted successfully",
      };
    }),

  /**
   * Update webhook
   */
  updateWebhook: protectedProcedure
    .input(
      z.object({
        webhookId: z.string(),
        url: z.string().url().optional(),
        events: z.array(z.string()).min(1).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const webhookData = await ctx.db.query.webhook.findFirst({
        where: (webhooks, { and, eq }) =>
          and(
            eq(webhooks.id, input.webhookId),
            eq(webhooks.userId, ctx.session.user.id),
          ),
      });

      if (!webhookData) {
        throw new Error("Webhook not found or you don't have permission");
      }

      const updates: any = {};
      if (input.url) updates.url = input.url;
      if (input.events) updates.events = input.events;
      if (input.isActive !== undefined) updates.isActive = input.isActive;

      const [updated] = await ctx.db
        .update(webhook)
        .set(updates)
        .where(eq(webhook.id, input.webhookId))
        .returning();

      return {
        success: true,
        webhook: updated,
      };
    }),

  /**
   * Get webhook deliveries (recent attempts)
   */
  getWebhookDeliveries: protectedProcedure
    .input(
      z.object({
        webhookId: z.string(),
        limit: z.number().int().max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const webhookData = await ctx.db.query.webhook.findFirst({
        where: (webhooks, { and, eq }) =>
          and(
            eq(webhooks.id, input.webhookId),
            eq(webhooks.userId, ctx.session.user.id),
          ),
      });

      if (!webhookData) {
        throw new Error("Webhook not found or you don't have permission");
      }

      const deliveries = await ctx.db.query.webhookDelivery.findMany({
        where: (deliveries, { eq }) =>
          eq(deliveries.webhookId, input.webhookId),
        orderBy: (deliveries, { desc }) => [desc(deliveries.createdAt)],
        limit: input.limit,
      });

      return deliveries;
    }),

  /**
   * Retry failed webhook delivery
   */
  retryWebhookDelivery: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const delivery = await ctx.db.query.webhookDelivery.findFirst({
        where: (deliveries, { eq }) =>
          eq(deliveries.id, input.deliveryId),
        with: {
          webhook: true,
        },
      });

      if (!delivery) {
        throw new Error("Delivery not found");
      }

      // Verify ownership through webhook
      if (delivery.webhook.userId !== ctx.session.user.id) {
        throw new Error("Not authorized");
      }

      // Implement webhook delivery retry with exponential backoff
      const currentAttempts = delivery.attempts;
      const maxRetries = 5;

      if (currentAttempts >= maxRetries) {
        await ctx.db
          .update(webhookDelivery)
          .set({
            status: "failed",
            errorMessage: "Max retries exceeded",
          })
          .where(eq(webhookDelivery.id, input.deliveryId));

        return {
          success: false,
          message: "Max retries exceeded",
        };
      }

      // Calculate next retry time with exponential backoff
      // Retry schedule: 1min, 5min, 15min, 1hour, 3hours
      const retryDelays = [60, 300, 900, 3600, 10800]; // in seconds
      const delay = retryDelays[currentAttempts] ?? 10800; // Default to 3 hours
      const nextRetryAt = new Date(Date.now() + delay * 1000);

      // Generate HMAC signature for webhook
      const crypto = await import("crypto");
      const signature = crypto
        .createHmac("sha256", delivery.webhook.secret)
        .update(delivery.payload)
        .digest("hex");

      // Attempt delivery
      try {
        const webhookData = delivery.webhook;
        const response = await fetch(webhookData.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Vendgros-Signature": signature,
            "X-Vendgros-Event": delivery.event,
          },
          body: delivery.payload,
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          // Success - mark as delivered
          await ctx.db
            .update(webhookDelivery)
            .set({
              status: "delivered",
              responseCode: response.status,
              deliveredAt: new Date(),
            })
            .where(eq(webhookDelivery.id, input.deliveryId));

          return {
            success: true,
            message: "Delivery successful",
          };
        } else {
          // Failed - schedule next retry
          await ctx.db
            .update(webhookDelivery)
            .set({
              status: "pending",
              attempts: currentAttempts + 1,
              nextRetryAt,
              responseCode: response.status,
              errorMessage: `HTTP ${response.status}: ${await response.text()}`,
            })
            .where(eq(webhookDelivery.id, input.deliveryId));

          return {
            success: false,
            message: `Delivery failed, retry scheduled for ${nextRetryAt.toISOString()}`,
          };
        }
      } catch (error) {
        // Error - schedule next retry
        await ctx.db
          .update(webhookDelivery)
          .set({
            status: "pending",
            attempts: currentAttempts + 1,
            nextRetryAt,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(webhookDelivery.id, input.deliveryId));

        return {
          success: false,
          message: `Delivery failed, retry scheduled for ${nextRetryAt.toISOString()}`,
        };
      }
    }),

  /**
   * Get available webhook events
   */
  getAvailableEvents: protectedProcedure.query(async () => {
    return {
      events: [
        {
          name: "listing.created",
          description: "Triggered when a new listing is created",
        },
        {
          name: "listing.updated",
          description: "Triggered when a listing is updated",
        },
        {
          name: "listing.published",
          description: "Triggered when a listing is published",
        },
        {
          name: "reservation.created",
          description: "Triggered when a reservation is made",
        },
        {
          name: "reservation.confirmed",
          description: "Triggered when a reservation is confirmed",
        },
        {
          name: "reservation.completed",
          description: "Triggered when a transaction is completed",
        },
        {
          name: "reservation.cancelled",
          description: "Triggered when a reservation is cancelled",
        },
        {
          name: "rating.created",
          description: "Triggered when a rating is submitted",
        },
        {
          name: "message.received",
          description: "Triggered when you receive a message",
        },
      ],
    };
  }),

  /**
   * Process pending webhook retries (should be called by a cron job)
   * Admin only for security
   */
  processPendingRetries: protectedProcedure.mutation(async ({ ctx }) => {
    // Check admin access
    const currentUser = await ctx.db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.session.user.id),
    });

    if (!currentUser?.isAdmin) {
      throw new Error("Admin access required");
    }

    // Find all pending deliveries where nextRetryAt is in the past
    const now = new Date();
    const pendingDeliveries = await ctx.db.query.webhookDelivery.findMany({
      where: (deliveries, { and, eq, lte }) =>
        and(eq(deliveries.status, "pending"), lte(deliveries.nextRetryAt, now)),
      limit: 50, // Process max 50 at a time
      with: {
        webhook: true,
      },
    });

    const results = {
      processed: 0,
      delivered: 0,
      failed: 0,
      retryScheduled: 0,
    };

    for (const delivery of pendingDeliveries) {
      results.processed++;

      const currentAttempts = delivery.attempts;
      const maxRetries = 5;

      if (currentAttempts >= maxRetries) {
        await ctx.db
          .update(webhookDelivery)
          .set({
            status: "failed",
            errorMessage: "Max retries exceeded",
          })
          .where(eq(webhookDelivery.id, delivery.id));

        results.failed++;
        continue;
      }

      // Calculate next retry time
      const retryDelays = [60, 300, 900, 3600, 10800];
      const delay = retryDelays[currentAttempts] ?? 10800;
      const nextRetryAt = new Date(Date.now() + delay * 1000);

      // Generate HMAC signature
      const crypto = await import("crypto");
      const signature = crypto
        .createHmac("sha256", delivery.webhook.secret)
        .update(delivery.payload)
        .digest("hex");

      // Attempt delivery
      try {
        const response = await fetch(delivery.webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Vendgros-Signature": signature,
            "X-Vendgros-Event": delivery.event,
          },
          body: delivery.payload,
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          await ctx.db
            .update(webhookDelivery)
            .set({
              status: "delivered",
              responseCode: response.status,
              deliveredAt: now,
            })
            .where(eq(webhookDelivery.id, delivery.id));

          results.delivered++;
        } else {
          await ctx.db
            .update(webhookDelivery)
            .set({
              status: "pending",
              attempts: currentAttempts + 1,
              nextRetryAt,
              responseCode: response.status,
              errorMessage: `HTTP ${response.status}`,
            })
            .where(eq(webhookDelivery.id, delivery.id));

          results.retryScheduled++;
        }
      } catch (error) {
        await ctx.db
          .update(webhookDelivery)
          .set({
            status: "pending",
            attempts: currentAttempts + 1,
            nextRetryAt,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(webhookDelivery.id, delivery.id));

        results.retryScheduled++;
      }
    }

    return results;
  }),
});
