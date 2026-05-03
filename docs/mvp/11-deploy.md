# 11 — Deploy

Primary target: **IBM Cloud Code Engine**. Vercel is a working fallback (the routes are vanilla Next.js). Firebase hosts Auth + Firestore in both cases.

## Prerequisites

- IBM Cloud account with Code Engine enabled (free tier available).
- `ibmcloud` CLI installed (`brew install ibmcloud-cli`) and the Code Engine plugin: `ibmcloud plugin install code-engine`.
- Container registry access: `ibmcloud cr login` (uses IBM Container Registry) or push to Docker Hub.
- Firebase project per `01-stack-and-setup.md`.

## IBM Code Engine — once

```bash
ibmcloud login --sso                              # browser SSO
ibmcloud target -g <resource-group> -r us-south    # pick region (match Watsonx)
ibmcloud ce project create --name firstblock
ibmcloud ce project select --name firstblock
```

## Build the container

`Dockerfile` (multi-stage, standalone Next.js output):

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

Add `output: "standalone"` to `next.config.ts` if not already set.

Build and push:

```bash
ibmcloud cr namespace-add <namespace>      # one-time
docker build -t us.icr.io/<namespace>/firstblock:latest .
docker push  us.icr.io/<namespace>/firstblock:latest
```

## Create the Code Engine app

```bash
ibmcloud ce app create \
  --name firstblock \
  --image us.icr.io/<namespace>/firstblock:latest \
  --port 3000 \
  --cpu 1 --memory 2G \
  --min-scale 0 --max-scale 5 \
  --request-timeout 300 \
  --env-from-secret firstblock-env \
  --registry-secret ibmcloud-registry-secret
```

`--request-timeout 300` matches the longest-running agent route (research, solutions). Bump only if you see Watsonx tool loops genuinely needing more time.

## Secrets

Code Engine secrets hold every env var from `01-stack-and-setup.md`:

```bash
ibmcloud ce secret create --name firstblock-env --from-literal \
  WATSONX_API_KEY=... \
  WATSONX_API_URL=https://us-south.ml.cloud.ibm.com \
  WATSONX_PROJECT_ID=... \
  WATSONX_AI_AUTH_TYPE=iam \
  WATSONX_AI_APIKEY=... \
  WATSONX_AI_PROJECT_ID=... \
  WATSONX_AI_SERVICE_URL=https://us-south.ml.cloud.ibm.com \
  WATSONX_MODEL_ID=ibm/granite-4-h-small \
  AGENT_MAX_STEPS=50 \
  NEXT_PUBLIC_FIREBASE_API_KEY=... \
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=... \
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
  NEXT_PUBLIC_FIREBASE_APP_ID=... \
  FIREBASE_CLIENT_EMAIL=... \
  FIREBASE_PRIVATE_KEY="$(printf '%s' "$RAW_KEY" | sed 's/$/\\n/' | tr -d '\n')" \
  JINA_API_KEY=...
```

`FIREBASE_PRIVATE_KEY` needs literal `\n` escapes for shell-safe storage.

`NEXT_PUBLIC_*` vars must be set at **build time**, not just runtime — bake them into the image via build args, or run `pnpm build` inside the container with the secret mounted.

## Domain + Firebase Authorized domains

```bash
ibmcloud ce app get --name firstblock --output url
# https://firstblock.<random>.us-south.codeengine.appdomain.cloud
```

In **Firebase Console → Authentication → Settings → Authorized domains**, add the Code Engine URL. Without it, popup sign-in fails in production.

For a custom domain: `ibmcloud ce domain-mapping create` + DNS CNAME → also add to Firebase Authorized domains.

## Firebase deploy

One-time:

```bash
pnpm dlx firebase login
pnpm dlx firebase init    # pick: Firestore. Skip Hosting (Code Engine serves the app).
```

`firebase.json` already has `firestore.rules` + `firestore.indexes.json` wired. Deploy:

```bash
pnpm dlx firebase deploy --only firestore:rules,firestore:indexes
```

Re-run whenever rules or indexes change.

## Vercel (fallback)

If Code Engine isn't available, Vercel runs the same code unchanged. Caveats:

- **Hobby plan** caps function duration at 60s — research/solutions will be cut short. Use Pro for `maxDuration: 300`.
- Set every env var in Vercel dashboard → Project → Settings → Environment Variables.
- Add the Vercel domain (`firstblock-xxx.vercel.app`) to Firebase Authorized domains.

```bash
pnpm dlx vercel link
pnpm dlx vercel --prod
```

## Watsonx smoke test

After deployment, sign in via the UI to set the cookie. Then from a browser-authenticated context (DevTools → fetch with credentials), hit a route:

```js
fetch("/api/agents/problems", {
  method: "POST", credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ rawInput: "test problem", inputType: "text" }),
}).then((r) => r.json()).then(console.log);
```

Should return `{ success: true, ... }` and create a doc under `users/{your-uid}/problems/`.

## Jina

No setup needed. After `docs/execute/03-real-jina-tools.md` lands, the agent tools call `s.jina.ai` and `r.jina.ai` keyless. Optionally set `JINA_API_KEY` for higher rate limits — get one at [jina.ai](https://jina.ai).

## Production smoke test

1. Open the app URL → land on the marketing page.
2. Sign in (Google or email). Verify `__session` cookie set in DevTools.
3. Complete onboarding.
4. Submit a problem. See it appear in the workspace list.
5. Run research. Watch Code Engine logs (`ibmcloud ce app logs --name firstblock --follow`). Confirm tool calls happen and the brief writes back.
6. Continue through all stages to PRD + phases.
7. Refresh the page — work persists (Firestore restores it).
8. Sign out, sign in again — same data restored.

## Common gotchas

- **`auth/unauthorized-domain`** → add the Code Engine URL to Firebase Authorized domains.
- **`Function timed out`** → on Vercel Hobby; upgrade or reduce `maxDurationMs` in agent calls.
- **`PERMISSION_DENIED` on Firestore reads** → rules deployment didn't take, or trying to read another user's data (correctly blocked).
- **Tool calls return stub text** → `docs/execute/03-real-jina-tools.md` hasn't landed yet; `StubSearchProvider` is still in place.
- **Watsonx 401** → IAM token expired (the SDK refreshes it; restart the function or wait).
- **Watsonx 404 on model_id** → project doesn't have the model enabled. Re-run the discovery curl from `01-stack-and-setup.md`.
- **CSRF 403 on every POST** → `Origin`/`Referer` header doesn't match `Host`. Confirm the app URL in Firebase Authorized domains and check for proxy stripping headers.
- **`NEXT_PUBLIC_*` undefined in browser** → these need to be present at `pnpm build` time, not just runtime. Build args in Dockerfile.

## Post-demo

Add expansion docs as needed. The three tool docs in `docs/expansion/tool-*.md` are drop-in. Lineage/branching, streaming PRD output, exports, and observability are bigger lifts; tackle them based on demo feedback.
