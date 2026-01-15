import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy, otp } from "better-auth/plugins";

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
      // OTP plugin for email and phone verification
      otp({
        sendOTP: async (data) => {
          // Custom OTP sending logic
          if (data.type === "email") {
            // Send via Resend
            if (!options.resendApiKey) {
              throw new Error("Resend API key not configured");
            }

            await sendEmailOTP({
              email: data.email,
              code: data.code,
              resendApiKey: options.resendApiKey,
            });
          } else if (data.type === "sms") {
            // Send via Twilio
            if (
              !options.twilioAccountSid ||
              !options.twilioAuthToken ||
              !options.twilioFromNumber
            ) {
              throw new Error("Twilio credentials not configured");
            }

            await sendSmsOTP({
              phoneNumber: data.phoneNumber,
              code: data.code,
              twilioAccountSid: options.twilioAccountSid,
              twilioAuthToken: options.twilioAuthToken,
              twilioFromNumber: options.twilioFromNumber,
            });
          }
        },
        sendOTPFrequency: 60, // 60 seconds between OTP requests
        expiresIn: 600, // 10 minutes expiry
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
