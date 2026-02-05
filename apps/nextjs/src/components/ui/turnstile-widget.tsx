"use client";

import { forwardRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { env } from "~/env";

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export const TurnstileWidget = forwardRef<
  TurnstileInstance,
  TurnstileWidgetProps
>(function TurnstileWidget({ onSuccess, onError, onExpire }, ref) {
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) return null;

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      onSuccess={onSuccess}
      onError={onError}
      onExpire={onExpire}
    />
  );
});
