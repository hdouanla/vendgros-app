import { Resend } from "resend";

export async function sendEmailOTP(params: {
  email: string;
  code: string;
  resendApiKey: string;
}) {
  const resend = new Resend(params.resendApiKey);

  // Use Resend's onboarding email for development
  // In production, use your verified domain: noreply@vendgros.ca
  const fromEmail = process.env.NODE_ENV === "production"
    ? "Vendgros <noreply@vendgros.ca>"
    : "Vendgros <onboarding@resend.dev>";

  try {
    await resend.emails.send({
      from: fromEmail,
      to: params.email,
      subject: "Your Vendgros Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #10b981; }
              .code-container { background: #f3f4f6; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
              .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981; font-family: 'Courier New', monospace; }
              .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="color: #10b981; margin: 0;">VENDGROS</h1>
                <p style="margin: 5px 0 0 0;">Community Bulk Sales Marketplace</p>
              </div>

              <h2>Welcome to Vendgros!</h2>
              <p>Your verification code is:</p>

              <div class="code-container">
                <div class="code">${params.code}</div>
              </div>

              <p>This code will expire in <strong>10 minutes</strong>.</p>
              <p>If you didn't request this code, please ignore this email.</p>

              <div class="footer">
                <p>© ${new Date().getFullYear()} Vendgros. All rights reserved.</p>
                <p>vendgros.ca | Community Bulk Sales</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`✅ Email OTP sent to ${params.email}`);
  } catch (error) {
    console.error("❌ Failed to send email OTP:", error);
    throw new Error("Failed to send verification email");
  }
}
