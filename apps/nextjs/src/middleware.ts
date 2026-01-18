import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/seller", "/buyer", "/admin", "/profile", "/settings"];

// Routes that should redirect to home if already logged in
const authRoutes = ["/auth/signin", "/auth/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isVerifyEmailPage = pathname === "/auth/verify-email";

  // Get session token from cookie
  const sessionToken = request.cookies.get("better-auth.session_token");

  if (!sessionToken) {
    // No session token
    if (isProtectedRoute || isVerifyEmailPage) {
      // Redirect to signin
      const url = request.nextUrl.clone();
      url.pathname = "/auth/signin";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Has session token - need to check account status for protected routes
  if (isProtectedRoute) {
    // We'll use a header to signal the app to check account status
    // The actual check will be done in the layout/page since middleware can't easily access DB
    const response = NextResponse.next();
    response.headers.set("x-check-verification", "true");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
