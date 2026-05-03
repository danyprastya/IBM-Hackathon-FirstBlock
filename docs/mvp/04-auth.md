# 04 — Auth

Firebase Auth — email/password + Google OAuth. Server-side verification via the `__session` cookie + Firebase Admin SDK. Middleware redirects unauthenticated users away from protected routes.

## Auth methods

The deployed app supports more than just Google sign-in:

- **Email + password** (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`)
- **Google OAuth** (`signInWithPopup`)
- **Password reset** (`sendPasswordResetEmail`)

Both auth methods write a `users/{uid}` doc on first sign-in (with `onboardingCompleted: false`) so the onboarding flow has a target document.

## AuthProvider + `useAuth`

`lib/contexts/AuthContext.tsx` is the live implementation. Exports:

```ts
interface AuthContextType {
  user: User | null;          // Firebase Auth User
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

On every `onAuthStateChanged` fire, the provider:
1. Sets the `user` state.
2. If signed in, fetches a fresh ID token via `user.getIdToken()` and writes a `__session` cookie with `samesite=strict; max-age=3600`.
3. If signed out, clears the cookie.

The cookie is what the middleware and the API-route auth helper read. **There is no `Authorization: Bearer` header** in client → server requests; everything rides the cookie.

## Layout integration

`app/layout.tsx` wraps the tree with `AuthProvider`. The login/register pages (`app/(auth)/login`, `app/(auth)/register`) handle the sign-in UX; the workspace pages (`app/(main)/workspace`, `/onboarding`) sit behind the middleware gate.

## Middleware

`middleware.ts` — protects `/workspace` and `/onboarding`, runs CSRF check on every mutating request (POST/PUT/DELETE/PATCH).

```ts
const protectedRoutes = ["/workspace", "/onboarding"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get("__session")?.value;

  // Protected routes: redirect to login if no token
  if (protectedRoutes.some((r) => pathname.startsWith(r)) && !authToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // CSRF: validate Origin/Referer for mutating requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");
    const isValidOrigin =
      origin === `http://${host}` ||
      origin === `https://${host}` ||
      (referer && new URL(referer).host === host);
    if (!isValidOrigin && !pathname.startsWith("/api/auth")) {
      return NextResponse.json({ error: "Invalid origin - CSRF protection" }, { status: 403 });
    }
  }

  return NextResponse.next();
}
```

Auth-state-aware redirects (e.g. "send authed users to `/workspace`" or "send users without onboarding to `/onboarding`") happen on the page itself, not in middleware — this avoids double-fetching the `users/{uid}` doc just to gate redirect.

## API route guard

Every `/api/agents/*` route calls `requireAuth(request)` from `lib/utils/apiAuth.ts` at the top:

```ts
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

export async function verifyAuthToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("__session")?.value;
    if (!token) return null;
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export function checkCSRF(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (!host) return false;
  return Boolean(
    origin === `http://${host}` ||
    origin === `https://${host}` ||
    (referer ? new URL(referer).host === host : false)
  );
}

export async function requireAuth(request: Request): Promise<string> {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    if (!checkCSRF(request)) throw new Error("Invalid origin - CSRF protection");
  }
  const userId = await verifyAuthToken();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}
```

Routes catch `Unauthorized` → 401, `CSRF` → 403, anything else → 500.

## Client fetch pattern

All UI code uses plain `fetch` with `credentials: "include"` so the cookie is sent:

```ts
const res = await fetch("/api/agents/research-problem", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ problemId, problemStatement }),
});
```

You don't need a wrapper helper — `credentials: "include"` is the only recurring detail. If the same-origin policy were to change in the future, wrap.

## Sign-in pages

`app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx` host the email+password forms with a Google button. After a successful sign-in:
1. The `users/{uid}` doc is created (or merged) with `onboardingCompleted: false`.
2. The page checks `onboardingCompleted` from the user doc.
3. Routes to `/onboarding` if `false`, `/workspace` if `true`.

## Verifying

1. `pnpm dev`, hit `/login`. Sign in via Google or email.
2. Verify `__session` cookie is set in DevTools → Application → Cookies.
3. Hit `/workspace` while signed out → middleware redirects to `/login?redirect=/workspace`.
4. Hit `POST /api/agents/problems` with a valid cookie via curl (paste cookie from devtools) — should succeed.
5. Hit the same URL with no cookie → 401.
6. Hit it from another origin (e.g. `Origin: https://evil.com`) → 403 (CSRF).
