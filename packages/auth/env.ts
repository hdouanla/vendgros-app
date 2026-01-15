import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export function authEnv() {
  return createEnv({
    server: {
      // Required for better-auth
      AUTH_SECRET:
        process.env.NODE_ENV === "production"
          ? z.string().min(1)
          : z.string().min(1).optional(),

      // Optional: Twilio for SMS OTP
      TWILIO_ACCOUNT_SID: z.string().optional(),
      TWILIO_AUTH_TOKEN: z.string().optional(),
      TWILIO_FROM_NUMBER: z.string().optional(),

      // Optional: Resend for Email OTP
      RESEND_API_KEY: z.string().optional(),

      NODE_ENV: z.enum(["development", "production"]).optional(),
    },
    runtimeEnv: process.env,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
