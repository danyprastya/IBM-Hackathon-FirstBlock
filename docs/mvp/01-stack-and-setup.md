# 01 — Stack & Setup

## Dependencies

`package.json` — pinned, with the AI SDK additions that `docs/execute/02-watsonx-ai-sdk-migration.md` lands. Until that migration runs, the `@ai-sdk/*`, `ai`, and `@ibm-cloud/watsonx-ai` deps will be missing in the live repo.

```json
{
  "name": "firstblock",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@ai-sdk/provider": "^3.0.10",
    "@ai-sdk/provider-utils": "^4.0.26",
    "@ibm-cloud/watsonx-ai": "^1.7.11",
    "ai": "^6.0.174",
    "firebase": "^12.4.0",
    "firebase-admin": "^13.7.0",
    "lucide-react": "^0.x",
    "next": "^16.2.4",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "react-markdown": "^9.0.0",
    "zod": "^4.4.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.4",
    "@types/node": "^24.12.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "postcss": "^8.5.13",
    "tailwindcss": "^4.2.4",
    "typescript": "^6.0.3"
  }
}
```

`zustand` is intentionally absent — the actual app uses React Context + custom hooks. See `03-zustand-store.md`.

## Environment variables

The actual repo uses these env-var names (note: they differ from the IBM SDK's `WATSONX_AI_*` convention because the current REST client predates the SDK migration; after `02-watsonx-ai-sdk-migration.md` lands, the SDK reads `WATSONX_AI_*` directly).

```bash
# --- Watsonx (current REST client reads these) ---
WATSONX_API_KEY=                    # IBM Cloud → Manage → Access (IAM) → API keys
WATSONX_API_URL=https://us-south.ml.cloud.ibm.com
WATSONX_PROJECT_ID=                 # watsonx.ai project home → Manage tab → Project ID

# --- After AI-SDK migration (docs/execute/02): SDK reads these directly ---
WATSONX_AI_AUTH_TYPE=iam
WATSONX_AI_APIKEY=                  # same value as WATSONX_API_KEY
WATSONX_AI_PROJECT_ID=              # same value as WATSONX_PROJECT_ID
WATSONX_AI_SERVICE_URL=https://us-south.ml.cloud.ibm.com

# --- Model selection (used by AI SDK provider) ---
WATSONX_MODEL_ID=ibm/granite-4-h-small  # default; swap once you've run discovery curl

# --- Agent loop ceiling (safety net, used after watchdog lands) ---
AGENT_MAX_STEPS=50

# --- Firebase web config (client) ---
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# --- Firebase Admin (server) ---
FIREBASE_CLIENT_EMAIL=              # from service-account JSON
FIREBASE_PRIVATE_KEY=               # from service-account JSON, escape \n if single-line

# --- Jina (web research tools — keyless OK, set for higher rate limits) ---
JINA_API_KEY=                       # OPTIONAL
```

The current `lib/firebase/admin.ts` uses split `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` rather than a single SA-JSON env. Either form works — the split form avoids base64 ceremony.

## Watsonx model discovery

The current code hard-codes `ibm/granite-3-8b-instruct` in two places (`lib/watsonx/client.ts` and `lib/agents/providers/watsonx.ts`). After the AI-SDK migration that string moves to `WATSONX_MODEL_ID`. To pick a better model, run:

```bash
TOKEN=$(curl -s -X POST https://iam.cloud.ibm.com/identity/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=$WATSONX_API_KEY" \
  | jq -r .access_token)

curl -s "$WATSONX_API_URL/ml/v1/foundation_model_specs?version=2024-05-31&filters=task_function_calling" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.resources[] | {model_id, label, provider, task_ids}'
```

Pick order:
1. `ibm/granite-4-1-*-instruct` (Granite 4.1, best on function calling)
2. `ibm/granite-4-h-small` (Granite 4.0 Small, hybrid Mamba-transformer)
3. `ibm/granite-3-8b-instruct` (current default, weakest tool-use)

## Firebase setup (one-time)

1. Firebase Console → create new project (`firstblock-<your-handle>`).
2. **Authentication** → Sign-in method → enable Google, Email/Password.
3. **Firestore Database** → Create database → production mode → pick region (current repo uses `asia-southeast1` per `firebase.json`).
4. Project Settings → General → Your apps → Add web app → copy config keys into `NEXT_PUBLIC_FIREBASE_*`.
5. Project Settings → Service accounts → Generate new private key → copy `client_email` and `private_key` into `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.

Firestore security rules and indexes are deployed separately — see `02-firestore-schema.md`.

## Firebase client init

`lib/firebase/client.ts` (already in repo):

```ts
"use client";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length === 0 ? initializeApp(config) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
```

## Firebase Admin init

`lib/firebase/admin.ts` (already in repo) initializes from split env vars and exports `adminAuth`, `adminDb`. Singleton-checked via `getApps()`.

## Smoke test

```bash
pnpm install
pnpm dev
```

Hit `http://localhost:3000`. Landing page renders. Sign in via `/login` or `/register`. After auth, you'll be routed through `/onboarding` (if not yet completed) then `/workspace`.

If Watsonx env is wrong, errors surface only when an agent route runs. Hit `POST /api/agents/problems` with a test body to confirm the chain works end-to-end. (After `docs/execute/05-agent-ui.md`, this is just a button click.)
