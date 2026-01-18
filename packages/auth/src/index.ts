import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, oAuthProxy } from "better-auth/plugins";

import { db } from "@acme/db/client";
import { user, session, account, verification } from "@acme/db/schema";

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
  // Only require email verification if Resend API key is configured
  const hasEmailConfig = !!options.resendApiKey;

  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user,
        session,
        account,
        verification,
      },
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: hasEmailConfig,
    },
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      expo(),
      // OTP plugin for email verification (only if Resend key is available)
      ...(hasEmailConfig
        ? [
            emailOTP({
              sendVerificationOTP: async (data: {
                email: string;
                otp: string;
                type: "sign-in" | "email-verification" | "forget-password";
              }) => {
                await sendEmailOTP({
                  email: data.email,
                  code: data.otp,
                  resendApiKey: options.resendApiKey!,
                });
              },
              expiresIn: 600, // 10 minutes expiry
              sendVerificationOnSignUp: true,
            }),
          ]
        : []),
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
