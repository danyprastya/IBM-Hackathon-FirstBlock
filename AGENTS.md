# FirstBlock — AGENTS.md

> Permanent instruction set for AI coding agent. Read before ANY task. Rules non-negotiable.

---

## Project Overview

**FirstBlock** — AI-powered business idea assistant for users stuck at "day zero" of starting business. Helps brainstorm, structure idea, lay "first block" of foundation.

**Feel:** Notion meets AI assistant — clean, structured, professional, workspace-like.

---

## Tech Stack (Strict — Do Not Deviate)

| Layer          | Technology                                                   |
| -------------- | ------------------------------------------------------------ |
| Framework      | Next.js 16+ (App Router) + TypeScript                        |
| Styling        | Tailwind CSS 4 + shadcn/ui (base-nova) — colors via CSS vars |
| AI             | IBM Watsonx.ai via REST API (server-side only)               |
| Authentication | Firebase Auth (client SDK + Admin SDK)                       |
| Database       | Firebase Firestore (client SDK + Admin SDK)                  |
| Storage        | Not yet implemented (reserved: `lib/ibm-cos/`)              |
| Icons          | Lucide React                                                 |
| Validation     | Zod                                                          |
| State          | React Context (AuthContext) + custom hooks                   |
| Package Mgr    | pnpm                                                         |
| Deployment     | IBM Cloud Code Engine (fallback: Vercel)                     |

---

## Folder Structure

```
firstblock/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/
│   │   ├── onboarding/page.tsx
│   │   └── workspace/page.tsx
│   ├── api/
│   │   ├── ai/
│   │   │   ├── chat/route.ts              ← Watsonx call + persist messages
│   │   │   └── messages/route.ts          ← Fetch chat history
│   │   ├── auth/[...nextauth]/            ← Empty (legacy, not used)
│   │   ├── checklist/                     ← Empty (not yet implemented)
│   │   ├── sticky/route.ts                ← Full CRUD for sticky notes
│   │   └── onboarding/route.ts            ← Save onboarding to Firestore
│   ├── layout.tsx                          ← Root layout + AuthProvider
│   ├── page.tsx                            ← Landing page (Hero+Features+CTA)
│   └── globals.css                         ← Theme vars + Tailwind + shadcn
├── components/
│   ├── ui/                ← shadcn: Button, Input, Card, Badge, Dialog,
│   │                         Label, Skeleton, Alert, AlertDialog,
│   │                         ScrollArea, Separator, Textarea
│   ├── chat/              ← ChatWindow, ChatMessage, ChatInput,
│   │                         TypingIndicator, ChecklistBlock
│   ├── checklist/         ← Empty (ChecklistBlock lives in chat/)
│   ├── sticky/            ← StickyBoard, StickyNote, StickyModal
│   ├── onboarding/        ← Empty (form logic in page component)
│   ├── layout/            ← Sidebar, WorkspaceLayout
│   └── landing/           ← Hero, Features, CTA
├── lib/
│   ├── firebase/
│   │   ├── client.ts                      ← Client SDK init (CLIENT ONLY)
│   │   ├── admin.ts                       ← Admin SDK init (SERVER ONLY)
│   │   └── collections.ts                 ← Firestore collection names + TS interfaces
│   ├── contexts/
│   │   └── AuthContext.tsx                 ← Firebase Auth provider + useAuth hook
│   ├── data/
│   │   └── content.ts                     ← Static content arrays (skills, interests, etc.)
│   ├── watsonx/
│   │   └── client.ts                      ← Watsonx REST client + system prompt builder
│   ├── ibm-cos/                           ← Empty (reserved for future COS integration)
│   ├── mongodb/
│   │   └── models/                        ← Empty (legacy, replaced by Firestore)
│   ├── appid/                             ← Empty (legacy, replaced by Firebase Auth)
│   ├── utils/
│   │   ├── apiAuth.ts                     ← Firebase Admin token verification + CSRF
│   │   ├── sanitize.ts                    ← XSS sanitization (HTML entities, text, color)
│   │   ├── rateLimit.ts                   ← 30 req/user/hr tracked in Firestore
│   │   └── validators.ts                  ← Zod schemas (onboarding, chat, sticky)
│   └── utils.ts                           ← shadcn cn() utility
├── hooks/
│   ├── useChat.ts                         ← Chat state + send/fetch via API routes
│   ├── useSticky.ts                       ← Sticky CRUD via API routes
│   └── useUserData.ts                     ← Real-time Firestore user doc listener
├── store/                                 ← Empty (no Zustand — using Context + hooks)
├── types/                                 ← Empty (types defined inline/in collections.ts)
├── middleware.ts                           ← Route protection + CSRF via cookie check
├── firebase.json                          ← Firestore config (asia-southeast1)
├── firestore.rules                        ← Security rules for Firestore collections
├── firestore.indexes.json                 ← Composite indexes for queries
├── .firebaserc                            ← Firebase project: ibmhackathon-firstblock
├── components.json                        ← shadcn config (base-nova, neutral)
├── .env.local                             ← All secrets (never commit)
├── .env.example                           ← Placeholder keys (safe to commit)
└── next.config.ts                         ← Security headers
```

---

## Color Theme

Defined in `globals.css` via CSS vars. Mapped to Tailwind via `@theme inline` block.
**Never hardcode hex in components.** Use Tailwind classes: `bg-bg-primary`, `text-accent-primary`, etc.

```css
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #0f1f3d;
  --accent-primary: #7c3aed;
  --accent-hover: #6d28d9;
  --accent-soft: #4c1d95;
  --accent-glow: rgba(124, 58, 237, 0.15);
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
  --border: oklch(0.922 0 0);
  --border-subtle: #0f172a;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

Also includes shadcn design tokens (oklch-based) for `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--sidebar-*`, etc. Dark mode variant via `.dark` class.

---

## Firestore Document Schemas (`lib/firebase/collections.ts`)

Collections: `users`, `messages`, `stickies`

### `UserDocument`

```ts
interface UserDocument {
  uid: string;               // Firebase Auth UID
  email: string;
  name?: string;
  onboardingCompleted: boolean;
  onboarding?: {
    location?: string;
    experience?: "never" | "tried" | "running";
    capital?: "<500" | "500-2000" | "2000-10000" | "10000+";
    skills?: string[];
    interests?: string[];
    hoursPerWeek?: "<10" | "10-20" | "20-40" | "fulltime";
    concern?: string;
    goal?: string;
  };
  project?: {
    businessName?: string;
    status: string;
    createdAt: Date;
  };
  rateLimit: {
    count: number;
    windowStart: Date;
  };
  createdAt: Date;
}
```

### `MessageDocument`

```ts
interface MessageDocument {
  userId: string;            // Firebase Auth UID
  role: "user" | "assistant";
  content: string;
  checklistItems?: string[];
  timestamp: Date;
}
```

### `StickyDocument`

```ts
interface StickyDocument {
  userId: string;            // Firebase Auth UID
  content: string;
  color: string;             // hex color
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Firebase Auth — Setup

### Client SDK (`lib/firebase/client.ts` — CLIENT ONLY)

```ts
"use client";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Admin SDK (`lib/firebase/admin.ts` — SERVER ONLY)

```ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Singleton init with service account credentials
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
```

### AuthContext (`lib/contexts/AuthContext.tsx` — CLIENT ONLY)

Provides: `user`, `loading`, `signIn`, `signUp`, `signInWithGoogle`, `signOut`, `resetPassword`

- Email/password auth via `signInWithEmailAndPassword` / `createUserWithEmailAndPassword`
- Google OAuth via `signInWithPopup`
- Sets `__session` cookie with Firebase ID token for middleware route protection
- Creates Firestore user doc on sign-up

### Auth check pattern (every API route)

```ts
import { requireAuth } from "@/lib/utils/apiAuth";

// Verifies Firebase ID token from __session cookie via Admin SDK
// Also checks CSRF on POST/PUT/DELETE/PATCH
const userId = await requireAuth(req);
```

`requireAuth()` does:
1. Extract `__session` cookie
2. Call `adminAuth.verifyIdToken(token)` → returns `uid`
3. CSRF check on mutating methods (Origin/Referer vs Host)

---

## IBM Watsonx Client (`lib/watsonx/client.ts` — SERVER ONLY)

```ts
export async function callWatsonx(messages: Message[], systemPrompt: string): Promise<string> {
  // Step 1: Exchange API key for IAM Bearer token
  // Step 2: Call Watsonx chat API with ibm/granite-3-8b-instruct
  // Returns: assistant message content string
}

export function buildSystemPrompt(userProfile: OnboardingData): string {
  // Builds personalized business advisor prompt from user profile
}
```

System prompt includes: user profile data, business strategy frameworks (Lean Startup, BMC, JTBD), response format guidelines, security instruction injection guard.

---

## Environment Variables (`.env.example`)

```
# IBM Watsonx.ai
WATSONX_API_KEY=
WATSONX_API_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=

# Firebase (Client — NEXT_PUBLIC_ = safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server — never expose)
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# NextAuth (session mgmt)
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

---

## Security Rules (Non-Negotiable)

### Environment Variables
- ALL secrets in `.env.local` only — never hardcode
- `NEXT_PUBLIC_` prefix ONLY for Firebase client config (non-sensitive)
- Watsonx keys, Firebase Admin creds = server-only

### Every API route must implement:

**1. Auth verification** — `requireAuth(req)` verifies Firebase ID token via Admin SDK.

**2. Zod validation** — before touching any data.

**3. CSRF** — `checkCSRF(req)` validates Origin/Referer on POST/PUT/DELETE/PATCH.

**4. XSS** — `sanitizeText()` / `sanitizeColor()` before storing to Firestore.

**5. IDOR** — every Firestore query scoped to authenticated `userId`:

```ts
const stickyDoc = await stickyRef.get();
if (stickyDoc.data()?.userId !== userId) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**6. SSRF** — Watsonx route only calls IBM whitelisted URL from env. No user-supplied URLs.

**7. Rate limiting** — 30 req/user/hour on `/api/ai/chat`, tracked in Firestore `users` doc `rateLimit` field.

**8. Security headers** in `next.config.ts`:

```ts
async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ],
  }];
}
```

**9. Firestore Security Rules** — `firestore.rules` enforces owner-only access per collection. Messages immutable (no update). Users can't delete own account via Firestore.

---

## Middleware (`middleware.ts`)

- Protected routes: `/workspace`, `/onboarding` → redirect to `/login` if no `__session` cookie
- Auth routes: `/login`, `/register` → page handles redirect logic (checks onboarding status)
- CSRF protection on all mutating requests (POST/PUT/DELETE/PATCH)
- Matcher excludes static assets, images, `_next/`

---

## Component Rules

- Every component: named export + explicit TypeScript Props interface
- No component fetches data directly — use custom hooks (`useChat`, `useSticky`, `useUserData`)
- All client API calls go through `/app/api/**` only
- `"use client"` only when strictly necessary
- All pages: Server Components by default
- No inline styles — Tailwind only, mapping to CSS variables
- UI primitives from shadcn/ui (base-nova style, neutral base color)

---

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useChat` | Chat state, send message via `/api/ai/chat`, fetch history via `/api/ai/messages` |
| `useSticky` | Sticky CRUD via `/api/sticky`, optimistic updates |
| `useUserData` | Real-time Firestore listener on user doc via client SDK `onSnapshot` |
| `useAuth` | From `AuthContext` — user state, sign in/up/out, Google OAuth, password reset |

---

## Build Progress

| # | Step | Status |
|---|------|--------|
| 1 | Project setup: Next.js + TS + Tailwind + globals.css + security headers | ✅ Done |
| 2 | Firebase setup (Auth + Firestore) + collections/interfaces | ✅ Done |
| 3 | Auth pages (login/register via Firebase Auth) | ✅ Done |
| 4 | Middleware: route protection + CSRF | ✅ Done |
| 5 | Landing page (Hero + Features + CTA) | ✅ Done |
| 6 | Onboarding form + save to Firestore | ✅ Done |
| 7 | Workspace layout (Sidebar + WorkspaceLayout) | ✅ Done |
| 8 | Sticky notes CRUD (API + components + hook) | ✅ Done |
| 9 | Chat UI (ChatWindow + ChatMessage + ChatInput + TypingIndicator) | ✅ Done |
| 10 | Watsonx integration + `/api/ai/chat` (all security) | ✅ Done |
| 11 | Chat history persistence + `/api/ai/messages` | ✅ Done |
| 12 | ChecklistBlock rendering (in chat/) | ✅ Done |
| 13 | Security audit (Zod, CSRF, XSS, IDOR, rate limit) | ✅ Done |
| 14 | Firestore security rules + indexes | ✅ Done |
| 15 | UI polish | 🔄 In progress |
| 16 | Deploy to IBM Cloud Code Engine | ⬜ Not started |
