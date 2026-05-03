# Execute 04 — Agent watchdog

## Goal

The AI SDK's `generateText({ tools, maxSteps })` will keep looping until `maxSteps` or the abort signal fires. With real tools (brief 03), a confused model can loop on the same `(toolName, args)` pair, burning tokens and time. Add three layers of safety:

1. **Hard step ceiling** — `AGENT_MAX_STEPS` env (default 50).
2. **Wallclock budget** — `AbortSignal.timeout(maxDurationMs - 20_000)` per route.
3. **Repeat-call watchdog** — abort if the same `(toolName, args)` fires 3× consecutively.

Per-tool timeouts (30s `web_search`, 60s `fetch_url`) and result truncation (8 KB markdown, 10-result cap, 300-char snippets) already landed inside the tool implementations in brief 03 — no change here.

After this brief: a misbehaving agent terminates within ~3 repeat tool calls, the agent's final output is forced via `generateObject` even on abort, and the route writes `status: "failed"` with a meaningful `errorMessage`.

## Read first

- [docs/mvp/06-watsonx-integration.md](../mvp/06-watsonx-integration.md) §"Anti-loop watchdog" — the watchdog source. **Copy verbatim.**
- [docs/mvp/07-agent-tools.md](../mvp/07-agent-tools.md) §"Loop bounds (deep-research without footguns)" — the six-layer defense; layers 1, 4, 5, 6 land here (2, 3 already in tools).
- Current code from brief 02:
  - `lib/agents/agents/problem-research.ts`, `solution-generator.ts`, `solution-research.ts` — Pattern-B agents that need the watchdog.

## Files to add

| Path | Purpose |
|---|---|
| `lib/agents/watchdog.ts` | `createWatchdog()` factory returning `{ aborted(), onStepFinish() }`. |

## Files to edit

| Path | Change |
|---|---|
| `lib/agents/agents/problem-research.ts` | Wire watchdog + soft-cap prompt + closing prompt branch. |
| `lib/agents/agents/solution-generator.ts` | Same. |
| `lib/agents/agents/solution-research.ts` | Same. |
| Each agent route's catch block | Distinguish timeout (`AbortError`) from other failures in `errorMessage`. |
| `.env.local` (if not set) | `AGENT_MAX_STEPS=50`. |

## Steps

### Step 1 — write `lib/agents/watchdog.ts`

```ts
// lib/agents/watchdog.ts
// Anti-loop watchdog: aborts when the same tool call repeats 3× consecutively.

export interface Watchdog {
  /** True after a third consecutive identical (toolName, args). */
  aborted: () => boolean;
  /** Pass into generateText({ onStepFinish }). */
  onStepFinish: (args: { toolCalls?: Array<{ toolName: string; input: unknown }> }) => void;
}

export function createWatchdog(): Watchdog {
  const recent: string[] = [];
  let aborted = false;

  return {
    aborted: () => aborted,
    onStepFinish: ({ toolCalls }) => {
      for (const call of toolCalls ?? []) {
        const key = `${call.toolName}:${JSON.stringify(call.input)}`;
        recent.push(key);
        if (recent.length > 4) recent.shift();
        if (recent.length === 3 && recent.every((x) => x === key)) {
          aborted = true;
        }
      }
    },
  };
}

// Made with Bob
```

### Step 2 — wire watchdog into ProblemResearch

```ts
// lib/agents/agents/problem-research.ts
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/watsonx/model";
import { tools } from "@/lib/agent-tools";
import { AGENT_PROMPTS } from "@/lib/agents/prompts";
import { createWatchdog } from "@/lib/agents/watchdog";
import type { OnboardingData } from "@/lib/firebase/collections";

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
  const startedAt = Date.now();
  const remainingSec = () =>
    Math.max(0, Math.round((input.maxDurationMs - (Date.now() - startedAt)) / 1000));

  const watchdog = createWatchdog();
  const baseSystem = AGENT_PROMPTS.ProblemResearch;
  const systemFn = () =>
    `${baseSystem}\n\nApprox time remaining: ${remainingSec()}s. ` +
    `5–15 well-chosen tool calls is normal. Stop when further searches would not change your conclusion.`;

  const result = await generateText({
    model,
    tools,
    maxSteps: Number(process.env.AGENT_MAX_STEPS ?? 50),
    system: systemFn,
    messages: [{ role: "user", content: buildUserMessage(input) }],
    temperature: 0.5,
    maxOutputTokens: 1500,
    abortSignal: AbortSignal.timeout(input.maxDurationMs - 20_000),
    onStepFinish: watchdog.onStepFinish,
  });

  const closingPrompt = watchdog.aborted()
    ? "You appear to have looped on the same tool call. Produce the final ProblemBrief now using what you already have, even if incomplete."
    : "Based on your research above, return the final ProblemBrief now as strict JSON.";

  const { object } = await generateObject({
    model,
    schema: briefSchema,
    messages: [
      ...result.response.messages,
      {
        role: "user",
        content: `${closingPrompt} No prose, no code fences, no preamble.`,
      },
    ],
    temperature: 0.2,
    maxOutputTokens: 1200,
  });

  return object;
}

function buildUserMessage(input: { /* ... */ }): string { /* unchanged from brief 02 */ }
```

The `system` parameter is now a **function** (recomputed each step) so `remainingSec` reflects elapsed wallclock. The AI SDK supports this — it calls the function once per step.

### Step 3 — wire watchdog into SolutionGenerator and SolutionResearch

Apply the same pattern. Soft-cap prompts vary slightly:

- **SolutionGenerator** — `3-6 well-chosen tool calls is enough. Solutions don't need as much depth as research.`
- **SolutionResearch** — `4-10 tool calls is normal. Focus on the four research areas, then stop.`

### Step 4 — handle `AbortError` and watchdog abort in route catch blocks

Each agent route's catch:

```ts
} catch (e) {
  const err = e as Error;
  const isTimeout = err.name === "AbortError" || err.name === "TimeoutError";
  const errorMessage = isTimeout
    ? "Agent timed out — try again with a tighter steer."
    : (err.message || "Agent failed");
  console.error(`[${routeName}] failed:`, errorMessage);
  await stageRef.update({ status: "failed", errorMessage });
  return NextResponse.json({ error: "Agent failed", detail: errorMessage }, { status: 500 });
}
```

Add `errorMessage: string` to `ResearchDocument`, `SolutionDocument`, `MVPDocument`, `SuccessMetricsDocument`, `PRDDocument`, `PhaseDocument` if not already present (check `lib/firebase/collections.ts` — most already have `errorMessage?: string` from earlier work).

### Step 5 — env

Add to `.env.local` (and prod secrets) if not present:

```
AGENT_MAX_STEPS=50
```

50 is the spec default. Tune per agent if needed by reading `process.env[`AGENT_MAX_STEPS_${type}`]` first, then falling back. Not required for MVP.

### Step 6 — wallclock budgets per route

Each tool-using route already declares `export const maxDuration = 300` (or should — set if missing per `docs/mvp/05-api-routes.md`). Pass that minus 20s into the agent's `maxDurationMs`:

```ts
// app/api/agents/research-problem/route.ts
export const maxDuration = 300;

const brief = await runProblemResearchAgent({
  problemStatement: sanitized,
  founderProfile,
  maxDurationMs: 280_000,   // = 300_000 - 20_000
});
```

The 20s buffer leaves time for the closing `generateObject` call to finish before the platform kills the function.

For non-tool agents (Scope, Metrics, PRD, Phase, Compactor) the `AbortSignal.timeout` isn't necessary — `generateObject` with `maxOutputTokens` is bounded.

## Don't touch

- `lib/agent-tools/*` — per-tool timeouts and truncation already in. Don't double-cap.
- `lib/watsonx/provider.ts` — the abort signal propagates through the SDK; no provider changes.
- Out-of-pipeline routes (`/api/ai/chat`, `/api/sticky`) — no change.

## Verification

```bash
# 1. Watchdog file exists
ls lib/agents/watchdog.ts

# 2. TS clean
pnpm tsc --noEmit

# 3. Manual loop test — temporarily make the model loop
#    Force this by editing a prompt to "always call web_search with query='test', no matter what"
#    Then submit a problem and run research.
#    Expected: agent fires web_search("test") 3× consecutively, then aborts.
#    The route returns 500 with errorMessage "Agent timed out — try again..."
#    or the closing generateObject still produces a brief if the watchdog only fired late.

# 4. Wallclock test — set maxDurationMs=10_000 in research-problem locally,
#    submit a complex problem. After ~10s the agent aborts and the closing
#    generateObject still runs to extract whatever has been collected.
#    Doc shows status="failed", errorMessage="Agent timed out..."

# 5. End-to-end
pnpm dev
# Run a normal research flow — should complete normally, no spurious aborts.
```

## Why this is brief 04

The watchdog only matters once real tools (brief 03) exist. The closing-prompt branch needs the AI SDK pattern (brief 02) — there's no `result.response.messages` to thread through in REST. Brief 05 (UI) renders the `errorMessage` field this brief populates.
