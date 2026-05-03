# Execute 02 — Watsonx → Vercel AI SDK

## Goal

The pipeline currently calls Watsonx via direct REST in `lib/watsonx/client.ts` and a hand-rolled `WatsonxProvider implements AIProvider` in `lib/agents/providers/watsonx.ts`. Tool calling is faked by injecting search results into the system prompt. Outputs are plain text, parsed by hand-rolled regex in `lib/agents/parsers.ts`.

After this brief: the agents call Watsonx via the **Vercel AI SDK** (`generateText` and `generateObject`), through a custom `LanguageModelV3` provider that maps to the IBM Watsonx SDK's chat API. Structured output is enforced by Zod schemas, not regex parsers. Tool calls happen for real (round-tripped through the model), unblocking real Jina tools in brief 03 and the watchdog in brief 04.

## Read first

- [docs/mvp/06-watsonx-integration.md](../mvp/06-watsonx-integration.md) — full target design including the patched provider source. **The provider class in §"Patched provider" is the spec — copy it verbatim.**
- [docs/mvp/08-agent-prompts.md](../mvp/08-agent-prompts.md) — patterns A (`generateObject`) and B (`generateText` + tools → `generateObject`).
- Current code:
  - `lib/watsonx/client.ts` — REST client, hard-codes `ibm/granite-3-8b-instruct`. Used by the chat assistant route too — see "Don't touch" below.
  - `lib/agents/providers/watsonx.ts` — `WatsonxProvider` with the prompt-injection tool-calling shim.
  - `lib/agents/executor.ts` — `AgentExecutor` calls `aiProvider.generateText` / `generateWithTools`.
  - `lib/agents/router.ts` — `AgentRouter.researchProblems`, `generateSolutions`, `researchSolutions`, `defineScopeAndMetrics`, `writePRD`, `writePhases`.
  - `lib/agents/parsers.ts` — `parseProblemBrief`, `parseSolutionBrief`, `parseSolutionDirections`, `parseScope`, `parseMetrics`.
  - `lib/agents/prompts.ts` — eight prompt strings.
  - All eight agent routes under `app/api/agents/` call `AgentRouter` then a parser.

## Files to add

| Path | Purpose |
|---|---|
| `lib/watsonx/provider.ts` | Custom `WatsonxChatModel implements LanguageModelV3` for the AI SDK. Source: docs/mvp/06-watsonx-integration.md §"Patched provider" — copy verbatim. |
| `lib/watsonx/model.ts` | `export const model = watsonx(process.env.WATSONX_MODEL_ID!);` |
| `lib/agents/clean/_shared.ts` | `steerTail`, `refineHead`, `JSON_DISCIPLINE` helpers from docs/mvp/08-agent-prompts.md §"Cross-cutting prompt patterns". |
| `lib/agents/agents/context-compactor.ts` | `runContextCompactorAgent({ upstreamOutput, stage })` — `generateText` only, returns `{ compactedContext: string }`. |
| `lib/agents/agents/problem-research.ts` | `runProblemResearchAgent({ problemStatement, founderProfile, founderInput, priorLabel?, maxDurationMs })` returning `ProblemBrief` via Pattern B. |
| `lib/agents/agents/solution-generator.ts` | Returns `{ count: number; directions: string[] }` via Pattern B (tools allowed for landscape scan). |
| `lib/agents/agents/solution-research.ts` | Returns `SolutionBrief` via Pattern B. |
| `lib/agents/agents/scope.ts` | Returns `{ scopeIn: string[]; scopeOut: string[]; constraintNote: string }` via Pattern A. |
| `lib/agents/agents/metrics.ts` | Returns `{ adoption: string; value: string; business: string; calibrationNote: string }` via Pattern A. |
| `lib/agents/agents/prd-writer.ts` | Returns `{ fullPrd: string }` via plain `generateText` (no schema, markdown). |
| `lib/agents/agents/phase.ts` | Returns `{ version: string; order: number; content: string }` via Pattern A. |

## Files to delete

| Path | Why |
|---|---|
| `lib/agents/providers/watsonx.ts` | The AI SDK *is* the provider abstraction; the `AIProvider` interface becomes redundant. |
| `lib/agents/parsers.ts` | Zod schemas via `generateObject` replace regex parsers entirely. |
| `lib/agents/types.ts` (the `AIProvider`, `SearchToolProvider`, `AgentExecutionContext` types) | Most of this file becomes dead. Keep `AgentType`, `StageType`, `STAGE_AGENTS` if useful elsewhere — verify with `grep`. |

## Files to edit

| Path | Change |
|---|---|
| `package.json` | Add deps. |
| `lib/agents/router.ts` | Replace each method with a call to the matching `runXxxAgent` from the new per-agent files. Methods now return typed objects, not `AgentResult` strings. |
| `lib/agents/executor.ts` | **Likely deletable** — once router calls `runXxxAgent` directly, the generic executor is unused. Verify with grep before deleting. |
| `app/api/agents/research-problem/route.ts` | Replace `AgentRouter.researchProblems` + `parseProblemBrief` with `runProblemResearchAgent` returning a typed `brief`. |
| `app/api/agents/generate-solutions/route.ts` | Same shape — drop `parseSolutionDirections`. |
| `app/api/agents/research-solution/route.ts` | Drop `parseSolutionBrief`. |
| `app/api/agents/define-scope/route.ts` | Drop `parseScope`. |
| `app/api/agents/define-metrics/route.ts` | Drop `parseMetrics`. |
| `app/api/agents/write-prd/route.ts` | Use `runPrdWriterAgent` returning `{ fullPrd }`. |
| `app/api/agents/write-phase/route.ts` | Use `runPhaseAgent` returning a typed phase block. |
| `app/api/agents/compact/route.ts` | Use `runContextCompactorAgent`. |
| `lib/agents/prompts.ts` | Keep prompt strings as the source of truth — the new per-agent files import them. |

## Steps

### Step 1 — install deps

```bash
pnpm add ai @ai-sdk/provider @ai-sdk/provider-utils @ibm-cloud/watsonx-ai
```

Versions to lock (per docs/mvp/01-stack-and-setup.md):

```json
"ai": "^6.0.174",
"@ai-sdk/provider": "^3.0.10",
"@ai-sdk/provider-utils": "^4.0.26",
"@ibm-cloud/watsonx-ai": "^1.7.11"
```

### Step 2 — env vars

Add to `.env.local` (and the production secret store):

```bash
WATSONX_AI_AUTH_TYPE=iam
WATSONX_AI_APIKEY=<same value as WATSONX_API_KEY>
WATSONX_AI_PROJECT_ID=<same value as WATSONX_PROJECT_ID>
WATSONX_AI_SERVICE_URL=<same value as WATSONX_API_URL>
WATSONX_MODEL_ID=ibm/granite-4-h-small
AGENT_MAX_STEPS=50
```

The IBM SDK reads `WATSONX_AI_*` directly. Keep the old `WATSONX_API_*` vars for now — `app/api/ai/chat/route.ts` (the out-of-scope chat assistant) still uses them.

### Step 3 — create `lib/watsonx/provider.ts` and `lib/watsonx/model.ts`

Copy the `WatsonxChatModel` class from `docs/mvp/06-watsonx-integration.md` §"Patched provider" verbatim into `lib/watsonx/provider.ts`. The class implements `LanguageModelV3` and maps:

- ai-SDK `LanguageModelV3Message` ↔ Watsonx `TextChatMessages`
- ai-SDK tool definitions ↔ Watsonx `tools` parameter
- ai-SDK tool choice ↔ Watsonx `toolChoice`
- Watsonx `tool_calls` response ↔ ai-SDK `tool-call` content parts
- Watsonx finish reasons ↔ `LanguageModelV3FinishReason`

Then `lib/watsonx/model.ts`:

```ts
import { watsonx } from "./provider";

const modelId = process.env.WATSONX_MODEL_ID;
if (!modelId) throw new Error("WATSONX_MODEL_ID env var is required");

export const model = watsonx(modelId);
```

`lib/watsonx/client.ts` already exports `getWatsonxClient()` — keep it (the provider uses it). The legacy `callWatsonx()` and `buildSystemPrompt()` exports stay because the chat assistant route uses them. They are not part of the pipeline.

### Step 4 — write per-agent files using Patterns A and B

Each agent gets its own file under `lib/agents/agents/`. Imports the matching prompt from `lib/agents/prompts.ts`. Returns a typed object.

**Pattern A (no tools, structured output) — Scope, Metrics, Phase:**

```ts
// lib/agents/agents/scope.ts
import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/watsonx/model";
import { AGENT_PROMPTS, UPSTREAM_CONTEXT_TEMPLATE } from "@/lib/agents/prompts";
import type { OnboardingData } from "@/lib/firebase/collections";

const schema = z.object({
  scopeIn: z.array(z.string().min(1)).min(3).max(7),
  scopeOut: z.array(z.string().min(1)).min(3).max(10),
  constraintNote: z.string().min(1),
});

export async function runScopeAgent(input: {
  problemStatement: string;
  chosenSolution: string;
  founderProfile: OnboardingData | null;
  compactedContext: string;
  founderInput?: string;
  priorLabel?: string;
}) {
  const system = input.compactedContext
    ? `${UPSTREAM_CONTEXT_TEMPLATE.replace("{{contextCompactorOutput}}", input.compactedContext)}\n\n${AGENT_PROMPTS.Scope}`
    : AGENT_PROMPTS.Scope;

  const { object } = await generateObject({
    model,
    schema,
    system,
    prompt: buildUserMessage(input),
    temperature: 0.4,
    maxOutputTokens: 800,
  });
  return object;
}

function buildUserMessage(input: { /* ... */ }): string { /* labeled sections incl. founder profile */ }
```

**Pattern B (tools then structured output) — ProblemResearch, SolutionGenerator, SolutionResearch:**

```ts
// lib/agents/agents/problem-research.ts
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/watsonx/model";
import { tools } from "@/lib/agent-tools";   // see brief 03 — for now, use empty {} placeholder
import { AGENT_PROMPTS, UPSTREAM_CONTEXT_TEMPLATE } from "@/lib/agents/prompts";

const briefSchema = z.object({
  marketSignal: z.string().min(20),
  painEvidence: z.string().min(20),
  competition: z.enum(["crowded", "white_space", "graveyard"]),
  competitionNote: z.string().min(10),
  aiVerdict: z.enum(["pursue", "watch", "drop"]),
  aiReason: z.string().min(10),
});

export async function runProblemResearchAgent(input: {
  problemStatement: string;
  founderProfile: OnboardingData | null;
  founderInput?: string;
  priorLabel?: string;
  maxDurationMs: number;
}) {
  const system = AGENT_PROMPTS.ProblemResearch;
  const userMsg = buildUserMessage(input);

  const result = await generateText({
    model,
    tools,                                     // {} until brief 03; agent will not call tools
    maxSteps: Number(process.env.AGENT_MAX_STEPS ?? 50),
    system,
    messages: [{ role: "user", content: userMsg }],
    temperature: 0.5,
    maxOutputTokens: 1500,
    abortSignal: AbortSignal.timeout(input.maxDurationMs),
  });

  const { object } = await generateObject({
    model,
    schema: briefSchema,
    messages: [
      ...result.response.messages,
      {
        role: "user",
        content:
          "Based on your research above, return the final ProblemBrief now as strict JSON. " +
          "No prose, no code fences, no preamble.",
      },
    ],
    temperature: 0.2,
    maxOutputTokens: 1200,
  });

  return object;
}
```

The eight agents to create:

1. `runContextCompactorAgent({ upstreamOutput, stage })` → `{ compactedContext: string }` — uses plain `generateText`, no schema.
2. `runProblemResearchAgent(...)` → `ProblemBrief` (Pattern B).
3. `runSolutionGeneratorAgent({ chosenProblem, compactedContext, founderProfile, ... })` → `{ count: 2|3|4; directions: string[] }` (Pattern B).
4. `runSolutionResearchAgent({ solutionDirection, chosenProblem, compactedContext, founderProfile, ... })` → `SolutionBrief` (Pattern B).
5. `runScopeAgent(...)` → `{ scopeIn, scopeOut, constraintNote }` (Pattern A).
6. `runMetricsAgent(...)` → `{ adoption, value, business, calibrationNote }` (Pattern A).
7. `runPrdWriterAgent({ problemBrief, solutionBrief, scopeIn, scopeOut, metrics, founderEdits })` → `{ fullPrd: string }` (plain `generateText`, no schema, markdown output).
8. `runPhaseAgent({ fullPrd, version, previousPhases, founderProfile })` → `{ version: string; order: number; content: string }` (Pattern A).

For each prompt, build the user message by stringifying labeled sections (founder profile + per-agent inputs). The exact label names must match what the prompt template references (`Founder profile:`, `Problem statement:`, `Chosen solution:`, etc. — see `lib/agents/prompts.ts` template variable names).

### Step 5 — rewrite `lib/agents/router.ts`

```ts
// lib/agents/router.ts
import type { OnboardingData } from "@/lib/firebase/collections";
import { runProblemResearchAgent } from "./agents/problem-research";
import { runSolutionGeneratorAgent } from "./agents/solution-generator";
import { runSolutionResearchAgent } from "./agents/solution-research";
import { runScopeAgent } from "./agents/scope";
import { runMetricsAgent } from "./agents/metrics";
import { runPrdWriterAgent } from "./agents/prd-writer";
import { runPhaseAgent } from "./agents/phase";
import { runContextCompactorAgent } from "./agents/context-compactor";

export const AgentRouter = {
  compact: runContextCompactorAgent,
  researchProblem: runProblemResearchAgent,
  generateSolutions: runSolutionGeneratorAgent,
  researchSolution: runSolutionResearchAgent,
  scope: runScopeAgent,
  metrics: runMetricsAgent,
  writePrd: runPrdWriterAgent,
  writePhase: runPhaseAgent,
};
```

The class-based `AgentRouter` with parallel/sequential helpers goes away. Parallel parts (multiple ProblemResearch, multiple SolutionResearch, Scope+Metrics) are now expressed at the route layer with `Promise.all`. Sequential PhaseAgent runs are expressed at the route layer with a `for` loop that passes `previousPhases` forward.

### Step 6 — update each route

Pattern (research-problem as example):

```ts
// app/api/agents/research-problem/route.ts
import { runProblemResearchAgent } from "@/lib/agents/agents/problem-research";
// ... requireAuth, schema, sanitize as before ...

const brief = await runProblemResearchAgent({
  problemStatement: sanitized,
  founderProfile,
  maxDurationMs: 280_000,
});

await researchRef.update({ status: "complete", brief });
return NextResponse.json({ success: true, researchId: researchRef.id, brief });
```

The route:
- Drops the import of `parseProblemBrief`.
- Calls the agent function directly.
- Writes the typed object straight to Firestore (it already matches the `ResearchDocument.brief` shape).
- Catches Zod errors from `generateObject` as schema-validation failures → patch `status: "failed"` → return 500.

Replicate for all 8 routes. The schema-validation error from `generateObject` should get a specific log line so you can diagnose prompt drift:

```ts
} catch (e) {
  const isSchema = e instanceof Error && e.name === "AI_NoObjectGeneratedError";
  console.error(`[agent] ${isSchema ? "schema" : "runtime"} failure:`, e);
  await stageRef.update({ status: "failed" });
  return NextResponse.json({ error: "Agent failed", schema: isSchema }, { status: 500 });
}
```

For routes that previously called the multi-execution helpers (`executeParallel`, `executeSequential`), express the orchestration directly:

```ts
// app/api/agents/define-scope and /define-metrics are independent routes,
// so each is just a single agent call. The CLIENT fires them in parallel.

// app/api/agents/write-phase: route receives one version at a time.
// Client loops sequentially across v1, v2, ..., complete and threads previousPhases.
```

### Step 7 — delete dead files

After all routes are migrated, the old code is unused:

```bash
rm lib/agents/providers/watsonx.ts
rm lib/agents/parsers.ts
rm lib/agents/executor.ts          # if not referenced elsewhere — verify with grep
rm lib/agents/tools.ts             # the StubSearchProvider — brief 03 replaces with real tools
# lib/agents/types.ts: trim to just AgentType + StageType if those are still used
```

### Step 8 — set up the empty `lib/agent-tools/` for brief 03

Create the placeholder so `runProblemResearchAgent` can import it:

```ts
// lib/agent-tools/index.ts
export const tools = {} as const;       // populated in execute/03-real-jina-tools.md
export type ToolName = keyof typeof tools;
```

After brief 03 lands, this exports `web_search` and `fetch_url`.

## Don't touch

- `lib/watsonx/client.ts` — keep `callWatsonx()` and `buildSystemPrompt()` exports for the chat assistant route (`app/api/ai/chat/route.ts`). Add the `getWatsonxClient` accessor described in `06-watsonx-integration.md` if not present.
- `app/api/ai/chat/route.ts`, `app/api/ai/messages/route.ts` — chat assistant, out of scope.
- `app/api/onboarding/route.ts`, `app/api/sticky/*` — out of scope.
- `lib/firebase/collections.ts` — schema unchanged (assuming brief 01 has landed). The brief shape expected by `generateObject` already matches `ResearchDocument.brief` and `SolutionDocument.brief`.
- `lib/agents/prompts.ts` — prompt strings stay; per-agent files import them. Don't rewrite the prompts.

## Verification

```bash
# 1. Deps installed
pnpm ls ai @ai-sdk/provider @ai-sdk/provider-utils @ibm-cloud/watsonx-ai

# 2. New provider exists, old artifacts gone
ls lib/watsonx/provider.ts lib/watsonx/model.ts
test ! -f lib/agents/providers/watsonx.ts
test ! -f lib/agents/parsers.ts

# 3. TS clean
pnpm tsc --noEmit

# 4. Smoke test the simplest route (no tools, structured output)
pnpm dev
# Sign in. Submit a problem with rawInput="founders waste time on PRDs".
# Then via DevTools fetch:
#   POST /api/agents/research-problem  body: { "problemId": "<id>", "problemStatement": "founders waste time on PRDs" }
# Without real tools (brief 03 not yet landed), the brief will be evidence-thin
# but the route should return success and the Firestore doc should have a typed brief
# matching the ResearchDocument.brief shape exactly.
```

## Why this is brief 02

The AI SDK is foundational. Real tools (brief 03) only work inside `generateText({ tools, maxSteps })`. The watchdog (brief 04) only works inside `generateText({ onStepFinish })`. The UI (brief 05) calls routes that depend on agents returning typed objects. Land this first, then the rest snap in.
