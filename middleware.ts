import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/workspace", "/onboarding"];

// Routes that should redirect if already authenticated
const authRoutes = ["/login", "/register"];

// Public routes that don't require authentication
const publicRoutes = ["/", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isPublicRoute =
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth");

  // CSRF Protection: Check Origin/Referer for mutating requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");

    // Allow requests from same origin
    const isValidOrigin =
      origin === `http://${host}` ||
      origin === `https://${host}` ||
      (referer && new URL(referer).host === host);

    if (!isValidOrigin && !pathname.startsWith("/api/auth")) {
      return NextResponse.json(
        { error: "Invalid origin - CSRF protection" },
        { status: 403 }
      );
    }
  }

  // For Firebase Auth, we rely on client-side auth state
  // Server-side auth verification happens in API routes via Firebase Admin SDK
  // Middleware only handles route-level redirects based on cookies/headers

  // Check for Firebase auth token in cookies
  const authToken = request.cookies.get("__session")?.value;

  // Protected routes: redirect to login if no auth token
  if (isProtectedRoute && !authToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes: Let the page handle the redirect logic
  // The login/register pages will check onboarding status and redirect appropriately
  // We don't redirect here to avoid bypassing the onboarding check

  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// Made with Bob
