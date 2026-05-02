// SERVER ONLY - API route authentication helpers
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * Verify Firebase auth token from request
 * Returns user ID if valid, null if invalid
 */
export async function verifyAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("__session")?.value;

    if (!token) {
      return null;
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error("Auth token verification error:", error);
    return null;
  }
}

/**
 * Check CSRF protection for mutating requests
 * Validates Origin/Referer headers
 */
export function checkCSRF(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!host) return false;

  // Allow requests from same origin
  const isValidOrigin =
    origin === `http://${host}` ||
    origin === `https://${host}` ||
    (referer ? new URL(referer).host === host : false);

  return Boolean(isValidOrigin);
}

/**
 * Standard auth check for API routes
 * Returns userId if authenticated, throws error if not
 */
export async function requireAuth(request: Request): Promise<string> {
  // Check CSRF for mutating requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    if (!checkCSRF(request)) {
      throw new Error("Invalid origin - CSRF protection");
    }
  }

  // Verify auth token
  const userId = await verifyAuthToken();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

// Made with Bob
