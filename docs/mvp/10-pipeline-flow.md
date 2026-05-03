# 10 — Pipeline Flow

How a stage actually runs, what gates the next stage, where compaction fits, and how errors surface. This is the contract that ties together client state, API routes, agents, and UI.

## Per-stage state machine

Each stage doc has a `status` field with these states (`AgentStatus = "running" | "complete" | "failed"`):

```
       ┌── client POSTs to /api/agents/<stage> ──┐
       │ (route creates doc, status="running")    │
       ▼                                          │
   running ────────────────────────────────────── │
       │  ┌─ agent succeeds ─────────────────────┘
       │  │   (route patches: status="complete", outputs)
       ▼  ▼
   complete ←── founderDecision write / founderConfirmed write
       │
       │  (regenerate creates a NEW sibling doc; this one becomes "earlier")
       ▼
   complete (still — versions are immutable once finished)

   running ──── agent throws / route catches ──→ failed
                                                  │
                                                  └── retry button → calls same route → new sibling
```

The "absent" state is just no doc in the subcollection. The first action on every stage is the route call which creates a doc with `status: "running"`.

## Compaction step

Between every gate the founder crosses, the client (or section component) does:

```ts
// 1. Build the upstream blob from the just-completed stage
const upstream = serializeStageForCompaction(stageDoc);

// 2. Call ContextCompactor
const { compactedContext } = await fetch("/api/agents/compact", {
  method: "POST", credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ upstreamOutput: upstream, stage: "define" }),
}).then((r) => r.json());

// 3. Persist on the appropriate parent doc so downstream agents can read it
await updateDoc(doc(db, PATHS.research(uid, pid, rid)), { compactedContext });
```

Then the next stage's route reads `compactedContext` from Firestore and feeds it into the agent's system prompt via `UPSTREAM_CONTEXT_TEMPLATE`.

The current code stores `compactedContext` on `ResearchDocument` and `SolutionCollectionDocument`. For Scope/Metrics, the compacted blob lives on the parent solution (consider adding a `compactedContext` field to `SolutionDocument` if not already there).

## Gate rules

Each stage section renders only when the prior stage's gate is satisfied. Implement as pure selector functions over Firestore listener state:

```ts
// lib/pipeline/gates.ts (to be created)
import type {
  ResearchDocument, SolutionDocument, MVPDocument, SuccessMetricsDocument, PRDDocument,
} from "@/lib/firebase/collections";

export const canEnterSolutions = (r?: ResearchDocument | null) =>
  r?.founderDecision?.verdict === "pursue";

export const canEnterScope = (s?: SolutionDocument | null) =>
  s?.founderDecision?.verdict === "pursue";

export const canEnterPrd = (mvp?: MVPDocument | null, m?: SuccessMetricsDocument | null) =>
  mvp?.founderConfirmed === true && m?.founderConfirmed === true;

export const canEnterPhases = (prd?: PRDDocument | null) =>
  prd?.status === "complete";
```

Components import these and conditionally render the next section.

| Stage | Unlocks when |
|---|---|
| Research | `problem` doc exists (i.e., founder submitted; no clean-problem step) |
| Solutions | active research has `founderDecision.verdict === "pursue"` |
| Scope + Metrics | active solution has `founderDecision.verdict === "pursue"` |
| PRD | active mvp `founderConfirmed === true` AND active metrics `founderConfirmed === true` |
| Phases | active PRD `status === "complete"` |
| Demo done | active PRD has phases up through `complete` |

## Sequence: a research run

```
Browser                              Next.js                            Firestore
   │                                    │                                  │
   │  click "Run research" (steer)      │                                  │
   ├── POST /api/agents/research-problem ─────────────────────────────────▶│
   │   { problemId, problemStatement, founderInput? }                      │
   │                                    ├── requireAuth + CSRF             │
   │                                    ├── read problem + onboarding      │
   │                                    ├── adminDb.create research        │
   │                                    │     status="running" ──────────▶│
   │◀──── snapshot listener: research vN (running) ────────────────────────│
   │  UI flips to spinner               │                                  │
   │                                    ├── AgentRouter.researchProblems   │
   │                                    │     ProblemResearch              │
   │                                    │       webSearch × N              │
   │                                    │       research × M               │
   │                                    │     parseProblemBrief (today)    │
   │                                    │     OR generateObject (post-#02) │
   │                                    ├── update {status,brief} ───────▶│
   │◀──── snapshot listener: research vN (complete + brief) ──────────────│
   │  UI re-renders with brief + verdict                                  │
   │                                    │                                  │
   │  founder clicks "Pursue"           │                                  │
   ├── POST /api/agents/gate-decision ──────────────────────────────────▶│
   │   { problemId, researchId, decision: { verdict: "pursue" } }         │
   │                                    ├── update {founderDecision} ───▶│
   │◀──── listener fires; canEnterSolutions = true ───────────────────────│
   │                                    │                                  │
   │  (compaction) ─── POST /api/agents/compact ─────────────────────────▶│
   │   { upstreamOutput, stage: "define" }                                │
   │                                    ◀── ContextCompactor returns text │
   │  client writes compactedContext to research doc ─────────────────────▶│
   │                                                                       │
   │  click "Generate solutions" → POST /api/agents/generate-solutions ──▶│
   │  ... (same pattern repeats for each subsequent stage) ...             │
```

## Compactor inputs by stage

What gets serialized into `upstreamOutput` for each compaction call:

| Compact between | upstreamOutput contents |
|---|---|
| Define → Develop | chosen problem `rawInput` + the chosen research's brief + founder verdict + reason |
| Develop → Scope | chosen solution direction + solution brief + founder verdict + reason + (compactedContext from Define if useful) |
| Scope → Deliver | chosen solution + scope (`scopeIn`/`scopeOut`) + metrics + founder confirmations + edits |

## Error handling

### Agent failure

Route catches → patches the stage doc → returns 500.

```ts
} catch (e) {
  await researchRef.update({ status: "failed" });
  return NextResponse.json({ error: "Research failed", detail: ... }, { status: 500 });
}
```

UI listener delivers the failed status. Section renders red box + Retry button. Retry calls the same route → new sibling doc.

### Network failure on the client

`fetch` rejects on a network error (or non-2xx if you opt to throw). The section component should patch `status: "failed"` on the local doc for immediate feedback if the route never got to write:

```ts
try {
  await fetch(`/api/agents/research-problem`, { ... });
} catch (e) {
  await updateDoc(doc(db, PATHS.research(uid, pid, rid)), {
    status: "failed", errorMessage: `Client-side: ${(e as Error).message}`,
  });
}
```

### Hosting timeout (Code Engine kill, Vercel Hobby cap, etc.)

If the function is killed mid-flight, the route doesn't get to patch `status: "failed"` — the doc stays `running`. Add a client-side watchdog that flips to failed after `maxDurationMs + 30s`:

```tsx
useEffect(() => {
  if (stage.status !== "running") return;
  const timer = setTimeout(() => {
    updateDoc(stageRef, { status: "failed", errorMessage: "Timed out — try again." });
  }, MAX_STAGE_MS);  // 320_000 for research, 90_000 for short stages
  return () => clearTimeout(timer);
}, [stage.status]);
```

## Concurrency

The MVP runs one stage at a time per problem. Two things to guard:

1. **Double-click on Run.** Disable the button while `stage.status === "running"`.
2. **Parallel stage runs across problems.** Each problem is independent — the listener model handles this correctly. No additional coordination needed.

Scope and Metrics within a single solution are intentionally parallel — fire both fetches simultaneously and let them race.

## What runs where

| Logic | Runs in |
|---|---|
| Auth state, listeners, gate evaluation, founder confirmations | Browser (AuthContext + per-section hooks + Firestore client SDK) |
| Token verification, agent loop, Watsonx calls, tool executors, Firestore writes | Next.js API route (server-only; holds Watsonx + Jina + Firebase Admin) |
| Source of truth for all data | Firestore |

Browser **never** calls Watsonx or Jina directly. Browser **never** writes to other users' data (rules block it anyway). Server **never** trusts request bodies for user identity (uid comes from verified `__session` cookie).

## Verifying

End-to-end smoke checklist (after `docs/execute/03` and `05` land):

1. Sign in. Complete onboarding. Submit problem `"founders waste time on PRDs"`. Card shows that text verbatim.
2. Run research. Watch network tab — one POST to `/api/agents/research-problem`, returns 200 in 30–120s. Firestore: research doc `status="complete"` with a real brief (not stub text).
3. Pursue. Compact. Solutions section renders.
4. Generate solutions. SolutionResearch runs in parallel for each direction. Pick one.
5. Run scope + metrics in parallel. Confirm both.
6. Write PRD. Markdown renders.
7. Write phases sequentially. Each phase reads prior phases.
8. Regenerate scope with steer `"focus on solo founders only"`. New sibling doc appears. VersionPicker switches between v1 and v2.
9. Force a failure (intercept `/api/agents/define-metrics` → 500). Red box renders. Retry → new sibling doc, no leftover "running" state.
