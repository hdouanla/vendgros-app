import { z } from "zod/v4";
import { eq, and, gt } from "@acme/db";
import { TRPCError } from "@trpc/server";

import { user, verification } from "@acme/db/schema";
import { sendSmsOTP } from "@acme/auth/otp/twilio";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { SMS_NOTIFICATIONS_CONFIG } from "../lib/notifications";

// Helper to generate 6-digit numeric OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to generate unique ID
function generateId(): string {
  return crypto.randomUUID();
}

export const phoneVerificationRouter = createTRPCRouter({
  /**
   * Send OTP to user's phone number
   * - Validates phone matches profile
   * - Rate limits (60s between requests)
   * - Generates 6-digit OTP
   * - Stores in verification table
   * - Sends via Twilio
   */
  sendOTP: protectedProcedure.mutation(async ({ ctx }) => {
    // Get user's phone number
    const userRecord = await ctx.db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, ctx.session.user.id),
      columns: { phone: true, phoneVerified: true },
    });

    if (!userRecord?.phone) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No phone number on profile. Please add a phone number first.",
      });
    }

    if (userRecord.phoneVerified) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Phone number is already verified.",
      });
    }

    const identifier = `phone:${userRecord.phone}`;

    // Check rate limit - no more than 1 OTP per 60 seconds
    const existingOTP = await ctx.db.query.verification.findFirst({
      where: (v, { eq, and, gt }) =>
        and(
          eq(v.identifier, identifier),
          gt(v.createdAt, new Date(Date.now() - 60 * 1000))
        ),
    });

    if (existingOTP) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Please wait 60 seconds before requesting a new code.",
      });
    }

    // Delete any existing OTPs for this phone
    await ctx.db
      .delete(verification)
      .where(eq(verification.identifier, identifier));

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    await ctx.db.insert(verification).values({
      id: generateId(),
      identifier,
      value: otp,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Check if phone verification SMS is enabled
    if (!SMS_NOTIFICATIONS_CONFIG.phoneVerification) {
      console.log(`[SMS DISABLED] Phone verification OTP for ${userRecord.phone}: ${otp}`);
      return {
        success: true,
        message: "Verification code sent to your phone.",
      };
    }

    // Send SMS via Twilio
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "SMS service not configured.",
      });
    }

    try {
      await sendSmsOTP({
        phoneNumber: userRecord.phone,
        code: otp,
        twilioAccountSid,
        twilioAuthToken,
        twilioFromNumber,
      });
    } catch (error) {
      console.error("Failed to send SMS OTP:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send verification code. Please try again.",
      });
    }

    return {
      success: true,
      message: "Verification code sent to your phone.",
    };
  }),

  /**
   * Verify OTP and mark phone as verified
   */
  verifyOTP: protectedProcedure
    .input(
      z.object({
        otp: z.string().length(6, "Code must be 6 digits"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user's phone number
      const userRecord = await ctx.db.query.user.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.session.user.id),
        columns: { phone: true, phoneVerified: true },
      });

      if (!userRecord?.phone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No phone number on profile.",
        });
      }

      if (userRecord.phoneVerified) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Phone number is already verified.",
        });
      }

      const identifier = `phone:${userRecord.phone}`;

      // Find valid OTP
      const storedOTP = await ctx.db.query.verification.findFirst({
        where: (v, { eq, and, gt }) =>
          and(
            eq(v.identifier, identifier),
            eq(v.value, input.otp),
            gt(v.expiresAt, new Date())
          ),
      });

      if (!storedOTP) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired verification code.",
        });
      }

      // Delete used OTP
      await ctx.db
        .delete(verification)
        .where(eq(verification.id, storedOTP.id));

      // Mark phone as verified
      await ctx.db
        .update(user)
        .set({
          phoneVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.session.user.id));

      return {
        success: true,
        message: "Phone number verified successfully.",
      };
    }),

  /**
   * Get user's phone verification status
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userRecord = await ctx.db.query.user.findFirst({
      where: (u, { eq }) => eq(u.id, ctx.session.user.id),
      columns: { phone: true, phoneVerified: true },
    });

    return {
      hasPhone: !!userRecord?.phone,
      phoneVerified: userRecord?.phoneVerified ?? false,
      phone: userRecord?.phone ?? null,
    };
  }),
});
