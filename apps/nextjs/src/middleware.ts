import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/seller", "/buyer", "/admin", "/profile", "/settings"];

// Routes that should redirect to home if already logged in
const authRoutes = ["/auth/signin", "/auth/signup"];

const maintenanceUnlockCookie = "vg_offline_unlocked";
const maintenancePaths = ["/offline", "/maintenance-unlock"];
const assetExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".webp",
  ".gif",
  ".ico",
  ".txt",
  ".xml",
  ".webmanifest",
];

const isAssetPath = (pathname: string) =>
  assetExtensions.some((ext) => pathname.endsWith(ext));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-vg-pathname", pathname);

  const maintenanceEnabled =
    process.env.MAINTENANCE_MODE === "true" ||
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
  const isMaintenancePath = maintenancePaths.some((route) =>
    pathname.startsWith(route),
  );
  const hasMaintenanceUnlock = request.cookies.get(maintenanceUnlockCookie);

  if (
    maintenanceEnabled &&
    !hasMaintenanceUnlock &&
    !isMaintenancePath &&
    !isAssetPath(pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/offline";
    const response = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    // Set cookie so client can detect maintenance mode and hide navbar/footer
    response.cookies.set("vg_maintenance_active", "true", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60, // Short-lived, refreshed on each request
    });
    return response;
  }

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isVerifyEmailPage = pathname === "/auth/verify-email";

  // Get session token from cookie
  // Note: better-auth uses __Secure- prefix on HTTPS (production)
  const sessionToken =
    request.cookies.get("__Secure-better-auth.session_token") ||
    request.cookies.get("better-auth.session_token");

  if (!sessionToken) {
    // No session token
    if (isProtectedRoute || isVerifyEmailPage) {
      // Redirect to signin
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.searchParams.set("callbackUrl", pathname);
      const redirectResponse = NextResponse.redirect(url);
      // Clear maintenance cookie if present
      if (request.cookies.get("vg_maintenance_active")) {
        redirectResponse.cookies.delete("vg_maintenance_active");
      }
      return redirectResponse;
    }
  }

  // Build normal response
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Clear maintenance cookie if not in maintenance mode
  if (request.cookies.get("vg_maintenance_active")) {
    response.cookies.delete("vg_maintenance_active");
  }

  // Has session token - need to check account status for protected routes
  if (sessionToken && isProtectedRoute) {
    response.headers.set("x-check-verification", "true");
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
