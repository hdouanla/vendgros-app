import { NextResponse } from "next/server";

const maintenanceUnlockCookie = "vg_offline_unlocked";

export function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/", url));

  response.cookies.set(maintenanceUnlockCookie, "true", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });

  return response;
}
