import { Resend } from "resend";
import twilio from "twilio";
import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

// ============================================================================
// SMS Notification Configuration
// Set each notification type to true/false to enable/disable SMS
// ============================================================================

export const SMS_NOTIFICATIONS_CONFIG = {
  // Reservation notifications
  reservationCreated: false,        // SMS when a reservation is created (to buyer)
  reservationConfirmedBuyer: false, // SMS when reservation is confirmed (to buyer)
  reservationConfirmedSeller: false,// SMS when reservation is confirmed (to seller)

  // Listing notifications
  listingApproved: false,           // SMS when listing is approved (to seller)
  scheduledListingPublished: false, // SMS when scheduled listing goes live (to seller)

  // Communication notifications
  newMessage: false,                // SMS when a new chat message is received

  // Payment notifications
  refundProcessed: false,           // SMS when refund is processed (to buyer)

  // Phone verification (should usually stay enabled)
  phoneVerification: true,          // SMS for phone number verification codes
} as const;

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel = "email" | "sms" | "push";

export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  pushTokens?: string[];
  languagePreference?: string;
}

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SmsNotification {
  to: string;
  message: string;
}

export interface PushNotification {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ============================================================================
// Email Notifications (Resend)
// ============================================================================

export async function sendEmail(params: EmailNotification): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return;
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: params.from ?? "Vendgros <noreply@vendgros.ca>",
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    console.log(`✅ Email sent to ${params.to}`);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
}

// ============================================================================
// SMS Notifications (Twilio)
// ============================================================================

export async function sendSms(params: SmsNotification): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio not configured, skipping SMS");
    return;
  }

  const client = twilio(accountSid, authToken);

  try {
    await client.messages.create({
      body: params.message,
      from: fromNumber,
      to: params.to,
    });
    console.log(`✅ SMS sent to ${params.to}`);
  } catch (error) {
    console.error("❌ Failed to send SMS:", error);
    throw error;
  }
}

// ============================================================================
// Push Notifications (Expo Push)
// ============================================================================

// Initialize Expo SDK client
let expoClient: Expo | null = null;

function getExpoClient(): Expo | null {
  if (!process.env.EXPO_ACCESS_TOKEN && process.env.NODE_ENV === "production") {
    console.warn("EXPO_ACCESS_TOKEN not configured for production");
    return null;
  }

  if (!expoClient) {
    expoClient = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      useFcmV1: true, // Use FCM v1 API
    });
  }

  return expoClient;
}

export async function sendPushNotification(
  params: PushNotification,
): Promise<void> {
  const expo = getExpoClient();

  if (!expo) {
    console.warn("Expo client not configured, skipping push notification");
    return;
  }

  // Filter out invalid tokens
  const validTokens = params.tokens.filter((token) =>
    Expo.isExpoPushToken(token),
  );

  if (validTokens.length === 0) {
    console.warn("No valid Expo push tokens provided");
    return;
  }

  // Create messages
  const messages: ExpoPushMessage[] = validTokens.map((token) => ({
    to: token,
    sound: "default",
    title: params.title,
    body: params.body,
    data: params.data || {},
    priority: "high",
    channelId: "default",
  }));

  try {
    // Send notifications in chunks (Expo recommends chunks of 100)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Error sending push notification chunk:", error);
      }
    }

    // Check for errors in tickets
    const errors = tickets.filter(
      (ticket) => ticket.status === "error",
    );

    if (errors.length > 0) {
      console.error(
        `${errors.length} push notifications failed:`,
        errors,
      );
    }

    console.log(
      `✅ Sent ${tickets.length - errors.length} push notifications successfully`,
    );
  } catch (error) {
    console.error("Failed to send push notifications:", error);
    throw error;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(params: {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<void> {
  // In production, you would query the database for push tokens
  // For now, this is a placeholder that logs the intent
  console.log(`📱 Would send push to ${params.userIds.length} users:`);
  console.log(`   Title: ${params.title}`);
  console.log(`   Body: ${params.body}`);

  // Example implementation:
  // const users = await db.user.findMany({
  //   where: { id: { in: params.userIds } },
  //   select: { pushTokens: true },
  // });
  // const tokens = users.flatMap(u => u.pushTokens || []);
  // await sendPushNotification({ ...params, tokens });
}

// ============================================================================
// Multi-Channel Notification Templates
// ============================================================================

export async function notifyReservationCreated(params: {
  buyerEmail: string;
  buyerPhone?: string;
  listingTitle: string;
  depositAmount: number;
  verificationCode: string;
  expiresAt: Date;
}): Promise<void> {
  const { buyerEmail, buyerPhone, listingTitle, depositAmount, verificationCode, expiresAt } = params;

  // Email notification
  await sendEmail({
    to: buyerEmail,
    subject: "Reservation Created - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #10b981; }
            .content { padding: 30px 0; }
            .code { font-size: 24px; font-weight: bold; color: #10b981; font-family: monospace; }
            .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #10b981; margin: 0;">VENDGROS</h1>
              <p style="margin: 5px 0 0 0;">Community Bulk Sales</p>
            </div>
            <div class="content">
              <h2>Reservation Created!</h2>
              <p>Your reservation for <strong>${listingTitle}</strong> has been created.</p>
              <p><strong>Deposit Amount:</strong> $${depositAmount.toFixed(2)} CAD</p>
              <p><strong>Verification Code:</strong> <span class="code">${verificationCode}</span></p>
              <p><strong>Pickup Deadline:</strong> ${expiresAt.toLocaleString()}</p>
              <p>Please complete your payment to confirm the reservation.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Vendgros. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  // SMS notification (optional, controlled by config)
  if (buyerPhone && SMS_NOTIFICATIONS_CONFIG.reservationCreated) {
    await sendSms({
      to: buyerPhone,
      message: `Vendgros: Reservation created for "${listingTitle}". Deposit: $${depositAmount.toFixed(2)}. Verification: ${verificationCode}. Complete payment to confirm.`,
    });
  }
}

export async function notifyReservationConfirmed(params: {
  buyerEmail: string;
  buyerPhone?: string;
  sellerEmail: string;
  sellerPhone?: string;
  listingTitle: string;
  quantity: number;
  pickupAddress: string;
  pickupInstructions?: string;
  verificationCode: string;
  balanceDue: number;
}): Promise<void> {
  const { buyerEmail, buyerPhone, sellerEmail, sellerPhone, listingTitle, quantity, pickupAddress, pickupInstructions, verificationCode, balanceDue } = params;

  // Notify buyer
  await sendEmail({
    to: buyerEmail,
    subject: "Reservation Confirmed - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Reservation Confirmed!</h2>
          <p>Your deposit has been received and your reservation is confirmed.</p>
          <p><strong>Item:</strong> ${listingTitle}</p>
          <p><strong>Quantity:</strong> ${quantity}</p>
          <p><strong>Pickup Address:</strong> ${pickupAddress}</p>
          ${pickupInstructions ? `<p><strong>Instructions:</strong> ${pickupInstructions}</p>` : ""}
          <p><strong>Verification Code:</strong> ${verificationCode}</p>
          <p><strong>Balance Due at Pickup:</strong> $${balanceDue.toFixed(2)} CAD</p>
          <p>Present this verification code or QR code at pickup.</p>
        </body>
      </html>
    `,
  });

  if (buyerPhone && SMS_NOTIFICATIONS_CONFIG.reservationConfirmedBuyer) {
    await sendSms({
      to: buyerPhone,
      message: `Vendgros: Reservation confirmed for "${listingTitle}". Code: ${verificationCode}. Balance: $${balanceDue.toFixed(2)}. Address: ${pickupAddress}`,
    });
  }

  // Notify seller
  await sendEmail({
    to: sellerEmail,
    subject: "New Reservation - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>New Reservation Received</h2>
          <p>You have a new confirmed reservation.</p>
          <p><strong>Item:</strong> ${listingTitle}</p>
          <p><strong>Quantity:</strong> ${quantity}</p>
          <p><strong>Verification Code:</strong> ${verificationCode}</p>
          <p>The buyer will present this code at pickup.</p>
        </body>
      </html>
    `,
  });

  if (sellerPhone && SMS_NOTIFICATIONS_CONFIG.reservationConfirmedSeller) {
    await sendSms({
      to: sellerPhone,
      message: `Vendgros: New reservation for "${listingTitle}" (Qty: ${quantity}). Code: ${verificationCode}`,
    });
  }
}

export async function notifyPickupComplete(params: {
  buyerEmail: string;
  sellerEmail: string;
  listingTitle: string;
}): Promise<void> {
  const { buyerEmail, sellerEmail, listingTitle } = params;

  // Notify buyer
  await sendEmail({
    to: buyerEmail,
    subject: "Pickup Complete - Rate Your Experience",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Pickup Complete!</h2>
          <p>Thank you for completing your pickup for "${listingTitle}".</p>
          <p>Please rate your experience with the seller. You have 7 days to submit your rating.</p>
          <p>Your rating will remain private until both parties have submitted their reviews.</p>
        </body>
      </html>
    `,
  });

  // Notify seller
  await sendEmail({
    to: sellerEmail,
    subject: "Pickup Complete - Rate Your Experience",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Pickup Complete!</h2>
          <p>The pickup for "${listingTitle}" has been completed.</p>
          <p>Please rate your experience with the buyer. You have 7 days to submit your rating.</p>
          <p>Your rating will remain private until both parties have submitted their reviews.</p>
        </body>
      </html>
    `,
  });
}

export async function notifyListingApproved(params: {
  sellerEmail: string;
  sellerPhone?: string;
  listingTitle: string;
}): Promise<void> {
  const { sellerEmail, sellerPhone, listingTitle } = params;

  await sendEmail({
    to: sellerEmail,
    subject: "Listing Approved - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Listing Approved!</h2>
          <p>Your listing "${listingTitle}" has been approved and is now live.</p>
          <p>Buyers in your area can now discover and reserve your items.</p>
        </body>
      </html>
    `,
  });

  if (sellerPhone && SMS_NOTIFICATIONS_CONFIG.listingApproved) {
    await sendSms({
      to: sellerPhone,
      message: `Vendgros: Your listing "${listingTitle}" has been approved and is now live!`,
    });
  }
}

export async function notifyListingRejected(params: {
  sellerEmail: string;
  listingTitle: string;
  reason: string;
}): Promise<void> {
  const { sellerEmail, listingTitle, reason } = params;

  await sendEmail({
    to: sellerEmail,
    subject: "Listing Needs Revision - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Listing Requires Changes</h2>
          <p>Your listing "${listingTitle}" requires some changes before it can be published.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please update your listing and resubmit for review.</p>
        </body>
      </html>
    `,
  });
}

export async function notifyAccountSuspended(params: {
  userEmail: string;
  reason: string;
}): Promise<void> {
  const { userEmail, reason } = params;

  await sendEmail({
    to: userEmail,
    subject: "Account Suspended - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Account Suspended</h2>
          <p>Your Vendgros account has been temporarily suspended.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please contact support if you have questions about this decision.</p>
        </body>
      </html>
    `,
  });
}

export async function notifyRatingReceived(params: {
  userEmail: string;
  listingTitle: string;
  stars: number;
}): Promise<void> {
  const { userEmail, listingTitle, stars } = params;

  await sendEmail({
    to: userEmail,
    subject: "New Rating Received - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>New Rating Received</h2>
          <p>You received a ${stars}-star rating for your transaction involving "${listingTitle}".</p>
          <p>Your rating is now visible since both parties have submitted reviews.</p>
        </body>
      </html>
    `,
  });
}

export async function sendMessageNotification(params: {
  recipientEmail: string;
  recipientPhone?: string;
  senderEmail: string;
  listingTitle: string;
  messagePreview: string;
}): Promise<void> {
  const { recipientEmail, recipientPhone, senderEmail, listingTitle, messagePreview } = params;

  // Email notification
  await sendEmail({
    to: recipientEmail,
    subject: "New Message - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>New Message Received</h2>
          <p>You have a new message about "${listingTitle}".</p>
          <p><strong>From:</strong> ${senderEmail}</p>
          <p><strong>Message:</strong> ${messagePreview}${messagePreview.length >= 50 ? "..." : ""}</p>
          <p>Log in to Vendgros to read the full message and reply.</p>
        </body>
      </html>
    `,
  });

  // SMS notification (optional, controlled by config)
  if (recipientPhone && SMS_NOTIFICATIONS_CONFIG.newMessage) {
    await sendSms({
      to: recipientPhone,
      message: `Vendgros: New message about "${listingTitle}". Log in to read and reply.`,
    });
  }
}

export async function notifyRefundProcessed(params: {
  buyerEmail: string;
  buyerPhone?: string;
  listingTitle: string;
  refundAmount: number;
}): Promise<void> {
  const { buyerEmail, buyerPhone, listingTitle, refundAmount } = params;

  await sendEmail({
    to: buyerEmail,
    subject: "Refund Processed - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Refund Processed</h2>
          <p>Your deposit for "${listingTitle}" has been refunded.</p>
          <p><strong>Refund Amount:</strong> $${refundAmount.toFixed(2)} CAD</p>
          <p>The refund will appear in your account within 5-10 business days.</p>
        </body>
      </html>
    `,
  });

  if (buyerPhone && SMS_NOTIFICATIONS_CONFIG.refundProcessed) {
    await sendSms({
      to: buyerPhone,
      message: `Vendgros: Your deposit of $${refundAmount.toFixed(2)} for "${listingTitle}" has been refunded.`,
    });
  }
}

export async function notifyAccountReactivated(params: {
  userEmail: string;
}): Promise<void> {
  const { userEmail } = params;

  await sendEmail({
    to: userEmail,
    subject: "Account Reactivated - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Account Reactivated</h2>
          <p>Your Vendgros account has been reactivated.</p>
          <p>You can now access all features of the platform again.</p>
          <p>Welcome back!</p>
        </body>
      </html>
    `,
  });
}

export async function notifyAccountBanned(params: {
  userEmail: string;
  reason: string;
}): Promise<void> {
  const { userEmail, reason } = params;

  await sendEmail({
    to: userEmail,
    subject: "Account Banned - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Account Banned</h2>
          <p>Your Vendgros account has been permanently banned.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>If you believe this was done in error, please contact support.</p>
        </body>
      </html>
    `,
  });
}

export async function notifyScheduledListingPublished(params: {
  sellerEmail: string;
  sellerPhone?: string;
  listingTitle: string;
}): Promise<void> {
  const { sellerEmail, sellerPhone, listingTitle } = params;

  await sendEmail({
    to: sellerEmail,
    subject: "Scheduled Listing Published - Vendgros",
    html: `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Listing Now Live</h2>
          <p>Your scheduled listing "${listingTitle}" has been automatically published.</p>
          <p>Buyers in your area can now discover and reserve your items.</p>
        </body>
      </html>
    `,
  });

  if (sellerPhone && SMS_NOTIFICATIONS_CONFIG.scheduledListingPublished) {
    await sendSms({
      to: sellerPhone,
      message: `Vendgros: Your scheduled listing "${listingTitle}" is now live!`,
    });
  }
}
