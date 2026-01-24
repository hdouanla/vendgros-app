import { NextResponse } from "next/server";

const maintenanceUnlockCookie = "vg_offline_unlocked";
const defaultUnlockKey = "vg_offline_unlocked";

export function GET(request: Request) {
  const url = new URL(request.url);
  const providedKey = url.searchParams.get("key");
  const expectedKey = process.env.MAINTENANCE_UNLOCK_KEY || defaultUnlockKey;

  // Validate unlock key
  if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json(
      { error: "Invalid or missing unlock key" },
      { status: 403 }
    );
  }

  const response = NextResponse.redirect(new URL("/", url));

  response.cookies.set(maintenanceUnlockCookie, "true", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });

  return response;
}
