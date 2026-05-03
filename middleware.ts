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



  // Auth routes: if user is authenticated, redirect to workspace
  if (isAuthRoute && authToken) {
    return NextResponse.redirect(new URL("/workspace", request.url));
  }

  // Landing page: if authenticated, send to workspace (the workspace
  // guard above will further bounce to /onboarding if not completed).
  if (pathname === "/" && authToken) {
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
