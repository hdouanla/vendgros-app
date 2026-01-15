import twilio from "twilio";

export async function sendSmsOTP(params: {
  phoneNumber: string;
  code: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
}) {
  const client = twilio(params.twilioAccountSid, params.twilioAuthToken);

  // Validate Canadian phone format (+1XXXXXXXXXX)
  if (!/^\+1[2-9]\d{9}$/.test(params.phoneNumber)) {
    throw new Error(
      "Invalid Canadian phone number format. Expected: +1XXXXXXXXXX",
    );
  }

  try {
    await client.messages.create({
      body: `Your Vendgros verification code is: ${params.code}\n\nThis code expires in 10 minutes.`,
      from: params.twilioFromNumber,
      to: params.phoneNumber,
    });

    console.log(`✅ SMS OTP sent to ${params.phoneNumber}`);
  } catch (error) {
    console.error("❌ Failed to send SMS OTP:", error);
    throw new Error("Failed to send verification SMS");
  }
}
