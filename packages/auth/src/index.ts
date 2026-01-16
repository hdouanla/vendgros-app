import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, oAuthProxy } from "better-auth/plugins";

import { db } from "@acme/db/client";

import { sendEmailOTP } from "./otp/resend";
import { sendSmsOTP } from "./otp/twilio";

export function initAuth<TExtraPlugins extends BetterAuthPlugin[] = []>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;

  // Twilio credentials for SMS OTP
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;

  // Resend API key for Email OTP
  resendApiKey?: string;

  extraPlugins?: TExtraPlugins;
}) {
  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      expo(),
      // OTP plugin for email verification
      emailOTP({
        sendVerificationOTP: async (data: {
          email: string;
          otp: string;
          type: "sign-in" | "email-verification" | "forget-password";
        }) => {
          // Send OTP via Resend
          if (!options.resendApiKey) {
            throw new Error("Resend API key not configured");
          }

          await sendEmailOTP({
            email: data.email,
            code: data.otp,
            resendApiKey: options.resendApiKey,
          });
        },
        expiresIn: 600, // 10 minutes expiry
        sendVerificationOnSignUp: true,
      }),
      ...(options.extraPlugins ?? []),
    ],
    trustedOrigins: ["expo://"],
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];

// Re-export client utilities
export * from "./client";
