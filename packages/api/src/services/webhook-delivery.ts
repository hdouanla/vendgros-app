import crypto from "crypto";
import { eq } from "drizzle-orm";

import { webhook, webhookDelivery } from "@acme/db/schema-extensions";

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
}

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Deliver webhook to endpoint
 */
export async function deliverWebhook(params: {
  url: string;
  payload: WebhookPayload;
  secret: string;
}): Promise<{
  success: boolean;
  responseCode?: number;
  responseBody?: string;
  errorMessage?: string;
}> {
  const payloadString = JSON.stringify(params.payload);
  const signature = generateWebhookSignature(payloadString, params.secret);

  try {
    const response = await fetch(params.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Vendgros-Signature": signature,
        "X-Vendgros-Event": params.payload.event,
        "User-Agent": "Vendgros-Webhooks/1.0",
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseBody = await response.text();

    return {
      success: response.ok,
      responseCode: response.status,
      responseBody: responseBody.substring(0, 1000), // Limit stored response
    };
  } catch (error: any) {
    return {
      success: false,
      errorMessage: error.message ?? "Unknown error",
    };
  }
}

/**
 * Trigger webhook for an event
 * This would be called from various parts of the application when events occur
 */
export async function triggerWebhook(params: {
  event: string;
  data: any;
  userId: string;
  db: any;
}): Promise<void> {
  // Find active webhooks for this user and event
  const activeWebhooks = await params.db.query.webhook.findMany({
    where: (webhooks: any, { and, eq }: any) =>
      and(
        eq(webhooks.userId, params.userId),
        eq(webhooks.isActive, true),
      ),
  });

  const matchingWebhooks = activeWebhooks.filter((w: any) =>
    w.events.includes(params.event),
  );

  // Deliver to each matching webhook
  for (const webhook of matchingWebhooks) {
    const payload: WebhookPayload = {
      event: params.event,
      data: params.data,
      timestamp: new Date().toISOString(),
    };

    const result = await deliverWebhook({
      url: webhook.url,
      payload,
      secret: webhook.secret,
    });

    // Record delivery attempt
    await params.db.insert(webhookDelivery).values({
      webhookId: webhook.id,
      event: params.event,
      payload: JSON.stringify(payload),
      status: result.success ? "success" : "failed",
      responseCode: result.responseCode,
      responseBody: result.responseBody,
      errorMessage: result.errorMessage,
      attempts: 1,
      deliveredAt: result.success ? new Date() : null,
    });

    // Update webhook failure count
    if (!result.success) {
      await params.db
        .update(webhook)
        .set({
          failureCount: webhook.failureCount + 1,
          lastFailureAt: new Date(),
        })
        .where(eq(webhook.id, webhook.id));
    } else {
      await params.db
        .update(webhook)
        .set({
          lastTriggeredAt: new Date(),
        })
        .where(eq(webhook.id, webhook.id));
    }
  }
}
