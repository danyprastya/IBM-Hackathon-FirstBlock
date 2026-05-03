# Expansion — Observability (agent traces, costs, retries)

**What:** A persistent log of every Watsonx call and tool execution, with input, output, token counts, latency, and final status. Plus a debug view for inspecting the full agent trace of any stage run.

**Why:** Without this, debugging a bad brief or expensive run is guesswork. With it, you can see exactly which queries the model ran, what came back, and where the run derailed. Essential past hackathon.

**Entry points:**
- New Firestore subcollection: `users/{uid}/runs/{runId}` — one doc per agent invocation. Fields: `stage`, `parentIds` (problem/research/etc.), `startedAt`, `endedAt`, `tokensIn`, `tokensOut`, `costUsd` (computed), `status`, `errorMessage`.
- New Firestore subcollection: `users/{uid}/runs/{runId}/steps/{stepId}` — one doc per `generateText` step. Fields: `kind: "tool_call" | "tool_result" | "assistant_message"`, `toolName?`, `args?`, `result?`, `text?`, `tokensIn`, `tokensOut`, `latencyMs`.
- `lib/agents/_log.ts` — wraps `generateText` in a `withTrace(stage, parentIds, fn)` helper. Records every step via `onStepFinish`. Computes cost from token counts × the configured rate per model.
- New route `app/api/runs/[runId]/route.ts` — returns the full trace for a run (auth-scoped to the run's owner).
- New UI: `components/RunInspector.tsx` — a side panel triggered by clicking a stage's "?" icon. Renders the step list with collapsible per-step details.

**Non-trivial bits:**
- Cost rates differ per model and change over time. Make `lib/cost-rates.ts` config-driven (one record per model id with `inputUsdPerMTok`, `outputUsdPerMTok`).
- For privacy, redact long tool results to first/last N chars before storing.

**Estimate:** 1 day. Half for the recording layer, half for the inspector UI.
