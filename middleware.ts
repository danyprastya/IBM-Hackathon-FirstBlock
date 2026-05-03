import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/workspace", "/onboarding"];

// Routes that should redirect if already authenticated
const authRoutes = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // CSRF Protection: Check Origin/Referer for mutating requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");

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

  // Check for Firebase auth token in cookies
  const authToken = request.cookies.get("__session")?.value;

  // Protected routes: redirect to login if no auth token
  if (isProtectedRoute && !authToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Onboarding guard: if user tries to access /workspace without
  // completing onboarding, block it. We store onboarding status in a
  // lightweight cookie set after onboarding completion.
  if (pathname.startsWith("/workspace") && authToken) {
    const onboardingDone = request.cookies.get("__onboarding_done")?.value;
    if (!onboardingDone) {
      // User has auth but no onboarding cookie — redirect to onboarding.
      // The onboarding page will check Firestore and set the cookie if
      // the user already completed onboarding (returning user).
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // Auth routes: if user is authenticated, redirect to workspace
  if (isAuthRoute && authToken) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// Made with Bob
