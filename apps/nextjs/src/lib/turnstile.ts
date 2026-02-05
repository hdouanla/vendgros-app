import "server-only";

import { env } from "~/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true when the secret key is not configured (dev mode).
 * Use this for non-auth forms (contact, reports, etc.) in tRPC routes.
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
    }),
  });

  const data = (await res.json()) as TurnstileVerifyResponse;
  return data.success;
}
