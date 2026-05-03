# docs/execute — Closing the gap to MVP

This folder contains five drop-in briefs for an AI coding agent. Each closes one specific gap between the deployed FirstBlock app and the spec in [docs/mvp/](../mvp/). Hand them to an AI agent one at a time, in order — each is self-contained.

## Background (read first if you're an AI coding agent)

FirstBlock is a Next.js 16 + Firebase + Watsonx app implementing a gated startup-ideation pipeline (Discover → Define → Develop → Scope → Deliver). The spec for this pipeline lives in `docs/mvp/00-overview.md` through `12-onboarding.md`.

The codebase has the **server-side scaffolding** for the pipeline (eight agents in `lib/agents/`, ten API routes under `app/api/agents/`, full Firestore schema in `lib/firebase/collections.ts`). What's **missing** for it to actually work end-to-end:

1. Founder input is being handled correctly **except** for a vestigial `cleanedStatement` field on `ProblemDocument` that should be removed (founder input must stay raw).
2. Watsonx is called via direct REST + hand-rolled text parsers. Switching to the Vercel AI SDK gives structured-output guarantees (Zod schemas) and a real tool loop.
3. Search tools are stubbed (`StubSearchProvider` returns empty). Real Jina-backed `web_search` and `fetch_url` are needed for ProblemResearch and SolutionResearch to produce real evidence.
4. There's no agent loop watchdog — runaway tool-call loops are unbounded.
5. There is no UI for the pipeline. The deployed app currently shows a chat assistant + sticky notes; the agent routes are reachable only by direct API call.

This folder addresses 1–5 in dependency order.

## Out of scope

The deployed app **also** includes these surfaces that are intentionally **not** part of the MVP pipeline. Do not modify them:

- `app/api/ai/chat/route.ts` and `app/api/ai/messages/route.ts` — chat assistant
- `components/chat/*` — chat UI including `ChecklistBlock`
- `app/api/sticky/route.ts` and `components/sticky/*` — sticky notes
- `lib/utils/rateLimit.ts` and the `rateLimit` field on `UserDocument` — out-of-pipeline

Each execute brief calls out specific files to leave alone in its "Don't touch" section.

## Order

| # | File | What it does | Depends on |
|---|---|---|---|
| 01 | [01-purge-cleaned-statement.md](./01-purge-cleaned-statement.md) | Remove the `cleanedStatement` field from `ProblemDocument` and every reference to it; downstream agents already use `rawInput` directly. | — |
| 02 | [02-watsonx-ai-sdk-migration.md](./02-watsonx-ai-sdk-migration.md) | Migrate the Watsonx integration from direct REST to the Vercel AI SDK. Adds a custom `LanguageModelV3` provider, replaces hand-rolled parsers with Zod schemas via `generateObject`. | 01 |
| 03 | [03-real-jina-tools.md](./03-real-jina-tools.md) | Replace `StubSearchProvider` with real `web_search` (Jina `s.jina.ai`) and `fetch_url` (Jina `r.jina.ai`) tools, including SSRF blocklist and 8 KB truncation. | 02 |
| 04 | [04-agent-watchdog.md](./04-agent-watchdog.md) | Add `AGENT_MAX_STEPS` ceiling, per-tool timeouts, and a repeat-call watchdog (abort on 3 consecutive identical tool calls). | 03 |
| 05 | [05-agent-ui.md](./05-agent-ui.md) | Build the workspace + per-stage section components (`Workspace`, `ProblemComposer`, `ProblemCard`, `ResearchSection`, `SolutionsSection`, `ScopeMetricsSection`, `PrdSection`, `PhasesSection`, `VersionPicker`, `SteerInput`). Wire to actual route names. Use Context + per-feature hooks (no Zustand). | 02 (so `generateObject` returns typed objects when sections render) |

You can land 01 and 02 first to clear the foundation, then 03+04 in one pass, then 05 last.

## How to use a brief

Each brief contains:

- **Goal** — one-paragraph summary of what changes after this lands.
- **Read first** — pointers into `docs/mvp/` for spec context, plus current-code line references.
- **Files to add / edit / delete** — explicit paths.
- **Steps** — ordered work, with code where the contract is non-obvious.
- **Don't touch** — files that look related but are out of scope.
- **Verification** — commands to run that prove the change worked.

Treat the briefs as authoritative for the final state. If a `docs/mvp/*.md` file disagrees with a brief, update the spec doc to match; don't deviate from the brief.

## Conventions across briefs

- Use `pnpm` (the repo's package manager — `pnpm-lock.yaml` is present).
- Don't run `npm` or `yarn`.
- Use the `PATHS` and `SUBCOLLECTIONS` constants in `lib/firebase/collections.ts` for every Firestore path. Never hand-roll a path string.
- Use `requireAuth(req)` from `lib/utils/apiAuth.ts` for every new API route.
- Use `sanitizeText` from `lib/utils/sanitize.ts` on every founder-supplied string before storage.
- Validate every request body with a Zod schema in `lib/utils/validators.ts`.
- New files include the existing repo's footer comment style: `// Made with Bob` (matches the existing convention in the repo).

## Verification across the whole sequence

After all five briefs land:

```bash
# 1. cleanedStatement is gone
grep -r "cleanedStatement" .   # zero hits in repo and docs

# 2. AI SDK installed
pnpm ls ai @ai-sdk/provider @ibm-cloud/watsonx-ai

# 3. Real tools, no stubs
grep -r "StubSearchProvider" .  # zero hits in lib/

# 4. Watchdog and ceiling
grep -r "AGENT_MAX_STEPS\|createWatchdog" lib/agents/

# 5. UI exists
ls components/workspace/   # Workspace.tsx, ProblemComposer.tsx, ProblemCard.tsx, sections/, parts/

# 6. End-to-end
pnpm dev
# Sign in → onboarding → submit problem → run research → see brief with REAL urls
# → pursue → generate solutions → research each → pick one → scope+metrics → confirm
# → write PRD → write phases → all docs land in Firestore
```
