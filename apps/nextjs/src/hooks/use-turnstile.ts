"use client";

import { useCallback, useRef, useState } from "react";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { env } from "~/env";

export function useTurnstile() {
  const widgetRef = useRef<TurnstileInstance>(null);
  const [token, setToken] = useState<string | null>(null);
  const isConfigured = !!env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const onSuccess = useCallback((t: string) => setToken(t), []);

  const onError = useCallback(() => setToken(null), []);

  const onExpire = useCallback(() => setToken(null), []);

  const reset = useCallback(() => {
    setToken(null);
    widgetRef.current?.reset();
  }, []);

  const turnstileHeaders: Record<string, string> = token
    ? { "x-captcha-response": token }
    : {};

  // Ready when we have a token, or when Turnstile is not configured
  const isReady = !isConfigured || !!token;

  return {
    widgetRef,
    token,
    isReady,
    isConfigured,
    turnstileHeaders,
    onSuccess,
    onError,
    onExpire,
    reset,
  } as const;
}
