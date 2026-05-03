# 00 — Overview

FirstBlock is a gated decision workflow for founders, organized as a **Double Diamond**: **Discover → Define → Develop → Scope → Deliver**. The user submits one or more problems, the system researches each, the user picks one, the system generates and researches solutions, the user picks one, the system defines scope and metrics in parallel, then writes a PRD and phases.

A **ContextCompactor** runs between every gate to compress upstream output into a ~300-token packet that the next stage's agents consume — keeps the prompt budget under control as the workflow deepens.

> **Out of MVP scope (already in the deployed app, ignore for this folder):** chat assistant at `app/api/ai/chat`, ChecklistBlock UI, sticky notes (`/api/sticky`), per-user rate limit. These exist but are not part of the pipeline this folder describes.

## Architecture

```
┌────────────────────┐    POST /api/agents/*     ┌──────────────────────┐
│  Browser           │ ─────────────────────────▶│  Next.js             │
│  React 19          │                            │                      │
│  Context + hooks   │ ◀─────────── JSON ────────│  requireAuth() guard │
│  Firestore client  │                            │  Watsonx (REST today,│
│  (live listeners)  │                            │   AI SDK after #02)  │
└──────────┬─────────┘                            │  Search tools (stub  │
           │ Firebase Auth                         │   today, Jina #03)   │
           │ Firestore reads (rules-scoped to uid) └──────────┬───────────┘
           ▼                                                  │ Firebase Admin SDK
┌────────────────────────────────────────────────────────────┴──────────┐
│  Firebase                                                              │
│  ├─ Auth (email+pw, Google OAuth)                                      │
│  └─ Firestore: users/{uid}/problems/.../researches/.../solutions/...   │
└────────────────────────────────────────────────────────────────────────┘
```

The browser writes Firestore directly for navigation/state; agent runs go through Next.js API routes, which hold the Watsonx key, run the agent loop server-side, and write back via the Admin SDK. Auth is a `__session` cookie verified by `requireAuth(req)` in `lib/utils/apiAuth.ts`.

## Data flow per stage

| User action | API route | Agents involved | Firestore writes |
|---|---|---|---|
| Submit problem | `POST /api/agents/problems` | none (raw input only) | create `problems/{id}` with `rawInput` (verbatim, never AI-rewritten) |
| Run problem research | `POST /api/agents/research-problem` | ProblemResearch | create `researches/{rid}`, set `brief`, `status: "complete"` |
| Pick problem (Define gate) | `POST /api/agents/gate-decision` | none | set `research.founderDecision` |
| Compact + generate solutions | `POST /api/agents/compact` then `POST /api/agents/generate-solutions` | ContextCompactor → SolutionGenerator | write `compactedContext` to research, create `solutionCollections/{cid}` + N `solutions/{sid}` (`direction` only) |
| Research each solution | `POST /api/agents/research-solution` (×N parallel) | SolutionResearch | set each solution's `brief`, `status: "complete"` |
| Pick solution (Develop gate) | `POST /api/agents/gate-decision` | none | set `solution.founderDecision` |
| Compact + scope/metrics | `POST /api/agents/compact` then `POST /api/agents/define-scope` + `POST /api/agents/define-metrics` (parallel) | ContextCompactor → Scope + Metrics | create `mvps/{mid}` and `successMetrics/{smid}` |
| Confirm scope/metrics | (direct Firestore write or dedicated route) | none | set `mvp.founderConfirmed` and `successMetrics.founderConfirmed` |
| Write PRD | `POST /api/agents/write-prd` | PRDWriter | create `prds/{pid}` with `fullPrd` |
| Write phases (sequentially) | `POST /api/agents/write-phase` (×N) | Phase | create `phases/{phid}` for each version |

Each agent run creates a **new doc** in the stage's subcollection — never overwrites. A version "regenerate with steer" creates a sibling doc in the same subcollection. The UI tracks "active" via convention (latest by `createdAt`) — there is no `activeXxxId` pointer in the current schema.

## Founder input is sacred

The MVP **does not** rewrite the founder's raw problem statement. There is no `clean-problem` agent and no `cleanedStatement` field is populated by AI. (The legacy `cleanedStatement` field still exists in `ProblemDocument` for backwards compatibility — see `docs/execute/01-purge-cleaned-statement.md` to remove it.) Downstream agents consume `rawInput` directly.

Every `founderInput` field on regenerate (steer) is also passed verbatim into the next agent's prompt. AI never paraphrases founder text.

## Demo script (5 steps)

1. Sign in (email+pw or Google).
2. Complete onboarding (location, capital, skills, hours/week, concern, goal).
3. Submit one or more problems. Click **Run research** on each (parallel) → each gets a `ProblemBrief` with verdict.
4. **Pick a problem** at the Define gate → click **Generate solutions** → SolutionGenerator decides N (2–4) and emits directions → SolutionResearch runs on each in parallel → each solution gets a brief.
5. **Pick a solution** at the Develop gate → Scope + Metrics run in parallel → confirm both → **Write PRD** → **Write phases** sequentially. Show the final PRD + phases.

## Glossary

- **Problem** — Founder's raw input. Verbatim, never AI-rewritten. Holds many `researches`.
- **Research (v1, v2…)** — Output of ProblemResearch + founder's verdict at the Define gate. One per problem; runs in parallel across problems. Holds `solutionCollections`.
- **SolutionCollection** — One run of SolutionGenerator. Contains N (2–4) `solutions`. Founder picks one at the Develop gate.
- **Solution** — A direction with feasibility/differentiation/edge analysis (filled by SolutionResearch). Branches into `mvps`, `successMetrics`, `prds`.
- **MVP / Scope** — `scopeIn[]`/`scopeOut[]` lists; founder confirms before next stage.
- **SuccessMetrics** — `adoption`, `value`, `business` strings; founder confirms.
- **PRD** — Markdown doc generated by PRDWriter. Holds N `phases`.
- **Phase** — One sequenced delivery chunk (`v1`, `v2`, … `complete`). Generated sequentially by PhaseAgent, each phase reads prior phases.
- **Verdict** — `"pursue" | "watch" | "drop"`. AI proposes one; founder gates with their own.
- **Steer** — Free-text founder input fed to the next regenerate run. Verbatim. Produces a sibling version doc.
- **ContextCompactor** — Dedicated agent that compresses a completed stage's full output into a ≤300-token packet for downstream agents. Runs between every gate.

## Build order

1. `01-stack-and-setup.md` — deps, env vars, model
2. `02-firestore-schema.md` — collections, rules, document interfaces
3. `03-zustand-store.md` — *now: client state via Context + hooks (Zustand not used)*
4. `04-auth.md` — cookie-session auth, `requireAuth(req)`, middleware
5. `05-api-routes.md` — actual route inventory, `requireAuth` skeleton, Zod schemas
6. `06-watsonx-integration.md` — patched provider for AI SDK
7. `07-agent-tools.md` — Jina tools (currently stubbed; see `docs/execute/03-real-jina-tools.md`)
8. `08-agent-prompts.md` — system prompts per stage (8 agents, no clean-problem)
9. `09-ui-components.md` — workspace + stage section components (currently unbuilt; see `docs/execute/05-agent-ui.md`)
10. `10-pipeline-flow.md` — gate rules, error handling, compaction
11. `11-deploy.md` — IBM Code Engine (Vercel as fallback)
12. `12-onboarding.md` — onboarding form + how it feeds founder profile into agents

For closing the gap between the spec and the deployed code, see `docs/execute/` — five drop-in briefs for an AI coding agent, ordered by dependency.
