/**
 * Ably real-time integration: token issuance and server-side publishing.
 * Clients subscribe via token auth; server publishes new messages to conversation channels.
 */

import Ably from "ably";

const CHANNEL_PREFIX = "conversation:";
const MESSAGE_EVENT = "message";
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 minutes (Ably max 24h for tokens)

function getApiKey(): string {
  const key = process.env.ABLY_API_KEY;
  if (!key) {
    throw new Error("ABLY_API_KEY is not set");
  }
  return key;
}

let restClient: Ably.Rest | null = null;

/**
 * Lazily create Ably REST client (server-side only). Used for token requests and publishing.
 */
export function getAblyRest(): Ably.Rest {
  if (!restClient) {
    restClient = new Ably.Rest({ key: getApiKey() });
  }
  return restClient;
}

/**
 * Channel name for a conversation (used for subscribe and publish).
 */
export function conversationChannel(conversationId: string): string {
  return `${CHANNEL_PREFIX}${conversationId}`;
}

/** Token request object returned to the client for Ably authCallback. */
export type AblyTokenRequest = Record<string, unknown>;

/**
 * Create a signed token request for a client to subscribe to a single conversation channel.
 * Caller must verify the user is allowed to access the conversation before calling.
 */
export async function createConversationTokenRequest(
  conversationId: string,
  clientId: string,
): Promise<AblyTokenRequest> {
  const channelName = conversationChannel(conversationId);
  const capability = JSON.stringify({ [channelName]: ["subscribe"] });
  const rest = getAblyRest();
  const tokenRequest = await rest.auth.createTokenRequest({
    clientId,
    capability,
    ttl: TOKEN_TTL_MS,
  });
  return tokenRequest as unknown as AblyTokenRequest;
}

/**
 * Payload we publish when a new message is sent (so clients can append or refetch).
 */
export type PublishedMessagePayload = {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string; // ISO
  attachments?: string[];
};

/**
 * Publish a new-message event to the conversation channel. Call after persisting the message.
 * No-op if ABLY_API_KEY is not set (e.g. dev without Ably).
 */
export async function publishNewMessage(
  conversationId: string,
  payload: PublishedMessagePayload,
): Promise<void> {
  const key = process.env.ABLY_API_KEY;
  if (!key) {
    return;
  }
  try {
    const rest = getAblyRest();
    const channel = rest.channels.get(conversationChannel(conversationId));
    await channel.publish(MESSAGE_EVENT, payload);
  } catch (err) {
    console.error("[Ably] Failed to publish new message:", err);
  }
}
