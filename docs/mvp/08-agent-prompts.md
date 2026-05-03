# 08 — Agent Prompts

The single most-load-bearing doc. Each agent has a system prompt, a user-prompt template, and an output schema. Treat the prompts as code: edit the wording precisely, don't paraphrase.

> **Founder input is sacred.** No agent in this pipeline rewrites the founder's raw text. The original spec included a `clean-problem` agent; that has been removed. `ProblemDocument.rawInput` is fed to `ProblemResearch` verbatim. Founder steer text on regenerate is also passed verbatim into the next agent's prompt.

> **Source of truth:** the live system prompts are in `lib/agents/prompts.ts` (string constants `CONTEXT_COMPACTOR`, `PROBLEM_RESEARCH`, `SOLUTION_GENERATOR`, `SOLUTION_RESEARCH`, `SCOPE`, `METRICS`, `PRD_WRITER`, `PHASE`). Edit the prompts there, not in this file. This doc captures the intent and the post-AI-SDK-migration code shape; the prompt text itself should match `prompts.ts` byte-for-byte.

All agent functions live in `lib/agents/<stage>.ts` and follow the patterns in `06-watsonx-integration.md` (Pattern A: `generateObject`; Pattern B: `generateText` + tools, then `generateObject` to extract). The current code instead calls `AgentRouter.<stageMethod>` which returns text parsed by `lib/agents/parsers.ts` — `docs/execute/02-watsonx-ai-sdk-migration.md` replaces that with the SDK pattern.

## Agent inventory

| # | Agent | Tools | Pattern | Prompt const |
|---|-------|-------|---------|--------------|
| 1 | ContextCompactor | none | generateObject | `CONTEXT_COMPACTOR` |
| 2 | ProblemResearch | webSearch, research (Jina via tool) | generateText+tools → generateObject | `PROBLEM_RESEARCH` |
| 3 | SolutionGenerator | webSearch, research | generateText+tools → generateObject | `SOLUTION_GENERATOR` |
| 4 | SolutionResearch | webSearch, research | generateText+tools → generateObject | `SOLUTION_RESEARCH` |
| 5 | Scope | none | generateObject | `SCOPE` |
| 6 | Metrics | none | generateObject | `METRICS` |
| 7 | PRDWriter | none | generateText (markdown) | `PRD_WRITER` |
| 8 | Phase | none | generateObject | `PHASE` |

**No `clean-problem` agent.** Raw founder input feeds ProblemResearch directly.

## Cross-cutting prompt patterns

Apply these **everywhere** (function helpers in `lib/agents/_shared.ts`):

```ts
export function steerTail(founderInput: string): string {
  if (!founderInput.trim()) return "";
  return `\n\nFounder steer for this version (apply explicitly, do not ignore): ${founderInput.trim()}`;
}

export function refineHead(priorLabel?: string): string {
  if (!priorLabel) return "";
  return (
    `You are producing a NEW version refining ${priorLabel}. ` +
    `Make it meaningfully different — different angle, different evidence, different framing. ` +
    `Do not paraphrase the prior version.\n\n`
  );
}

export const JSON_DISCIPLINE =
  "Your final assistant message must be valid JSON matching the schema. " +
  "No prose, no code fences, no preamble.";
```

These get composed into each agent's system prompt as needed.

---

## 1. ContextCompactor

Runs between every gate to compress upstream output into ≤300 tokens. Output is plain text in a fixed labeled-section format that the next agent's system prompt can consume directly.

`lib/agents/context-compactor.ts` (post-migration; currently routed through `AgentRouter.compact`):

```ts
import { generateText } from "ai";
import { model } from "@/lib/watsonx/model";
import { AGENT_PROMPTS } from "./prompts";

export async function runContextCompactorAgent(input: {
  upstreamOutput: string;
  stage: "discover" | "define" | "develop" | "scope" | "deliver";
}): Promise<{ compactedContext: string }> {
  const { text } = await generateText({
    model,
    system: AGENT_PROMPTS.ContextCompactor,
    prompt: `Stage just completed: ${input.stage}\n\nFull upstream output:\n${input.upstreamOutput}`,
    temperature: 0.3,
    maxOutputTokens: 500,
  });
  return { compactedContext: text };
}
```

The prompt enforces this output format (see `prompts.ts`):

```
[STAGE: <name of the stage just completed>]
[CHOSEN: <what was chosen at the gate — one line>]
[REASON: <founder's reason verbatim, or "not provided">]
[KEY FACTS:
- <fact — under 15 words>
- <fact>
(max 8 bullets)]
[SIGNALS: <market or feasibility data — max 3 lines, numbers and sources only>]
[REJECTED: <list of non-chosen items — one-liner each>]
```

The compacted text is injected into the next stage's system prompt via `UPSTREAM_CONTEXT_TEMPLATE` (also in `prompts.ts`).

---

## 2. ProblemResearch (deep-research agent)

The headline tool-using agent. Uses `web_search` + `fetch_url`. No fixed step cap.

`lib/agents/research.ts`:

```ts
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/watsonx/model";
import { tools } from "@/lib/agent-tools";
import { createWatchdog } from "./watchdog";
import { steerTail, refineHead, JSON_DISCIPLINE } from "./_shared";

const briefSchema = z.object({
  marketSignal:    z.string().min(20),
  painEvidence:    z.string().min(20),
  competition:     z.enum(["crowded", "white_space", "graveyard"]),
  competitionNote: z.string().min(10),
  aiVerdict:       z.enum(["pursue", "watch", "drop"]),
  aiReason:        z.string().min(10),
});

export async function runResearchAgent(input: {
  problemStatement: string;
  founderInput: string;
  priorLabel?: string;
  maxDurationMs: number;
}) {
  const startedAt = Date.now();
  const remainingSec = () =>
    Math.max(0, Math.round((input.maxDurationMs - (Date.now() - startedAt)) / 1000));

  const watchdog = createWatchdog();

  const system =
    refineHead(input.priorLabel) +
    `You are FirstBlock's research agent. Your job: validate or invalidate this founder's
problem with concrete, sourced evidence, then deliver a structured ProblemBrief.

Strategy:
- Cast a wide net with web_search across query types:
  • market sizing/funding: "X market size 2026", "X funding rounds 2025-2026"
  • pain evidence: "site:reddit.com/r/startups <topic>", "site:reddit.com/r/Entrepreneur <topic>",
    "site:reddit.com/r/indiehackers <topic>", "site:news.ycombinator.com <topic>"
  • competitor scan: "best X tools", "X alternatives 2026", "Show HN X"
- Then fetch_url 1–3 of the highest-signal results — a top Reddit thread, an HN comment thread,
  a credible article, or a key competitor's homepage.
- Cite concrete numbers (% growth, $ raised, thread comment counts, upvote counts). Name the
  source: "r/startups thread, 247 comments", "HN Show post, 89 points", "TechCrunch article".
- Cross-source claims: one source = anecdote, three sources = signal.

Verdict rules:
- white_space + strong demand signal → pursue
- crowded with no clear edge → drop
- signal exists but TAM unclear, or competition mixed → watch

Tool discipline:
- 5–15 well-chosen tool calls is normal for a hard problem. Stop when further searches would
  not change your conclusion.
- Avoid repeating the same query verbatim. If a search returns weak results, broaden or pivot.
- If all tools fail or return nothing useful, write the brief from training-data knowledge and
  set aiReason to flag the data gap (start with "Limited live data — based on prior knowledge:").

${JSON_DISCIPLINE}`;

  const userMsg =
    `Problem statement:\n${input.problemStatement}\n` +
    steerTail(input.founderInput) +
    `\n\nDo your research, then produce the ProblemBrief.`;

  const result = await generateText({
    model,
    tools: { web_search: tools.web_search, fetch_url: tools.fetch_url },
    maxSteps: Number(process.env.AGENT_MAX_STEPS ?? 50),
    system: () =>
      system + `\n\nApprox time remaining: ${remainingSec()}s. Pace yourself.`,
    messages: [{ role: "user", content: userMsg }],
    temperature: 0.4,
    maxOutputTokens: 2000,
    abortSignal: AbortSignal.timeout(input.maxDurationMs),
    onStepFinish: watchdog.onStepFinish,
  });

  const closingPrompt = watchdog.aborted()
    ? "You appear to have looped. Produce the final ProblemBrief now using what you already have, even if incomplete."
    : "Based on your research above, return the final ProblemBrief now as strict JSON.";

  const { object } = await generateObject({
    model,
    schema: briefSchema,
    messages: [
      ...result.response.messages,
      { role: "user", content: closingPrompt + " " + JSON_DISCIPLINE },
    ],
    temperature: 0.2,
    maxOutputTokens: 1200,
  });

  return object;
}
```

Worked example output:
```json
{
  "marketSignal": "Search for 'PRD template' up 78% YoY (Google Trends, 2024-2026). Lenny's Newsletter PRD GPT post hit 1.2k HN points — top thread of Q1 2026.",
  "painEvidence": "r/startups thread '/why does writing a PRD with my cofounder take a week' — 247 comments, 89 upvotes, repeated theme: ping-pong cycles. HN Ask thread (47 points) confirms.",
  "competition": "white_space",
  "competitionNote": "Notion templates are static. Lenny's GPT is single-shot. No tool enforces founder gates between stages — that's the wedge.",
  "aiVerdict": "pursue",
  "aiReason": "Strong, multi-source pain signal + fragmented competition. Gated decision flow is differentiated and addresses the specific pain pattern we found."
}
```

---

## 3. SolutionGenerator

Tools: `web_search`, `research`. Decides N (2–4) directions and emits them as one-liners; downstream `SolutionResearch` then briefs each direction in parallel.

The actual implementation lives in `lib/agents/router.ts` as `AgentRouter.generateSolutions`. The legacy spec text below predates the split into Generator + per-direction Research — keep the schema/wiring as a reference for what the post-migration `SolutionGenerator` should produce. The output schema should be:

```ts
const solutionsSchema = z.object({
  count: z.number().int().min(2).max(4),
  directions: z.array(z.string().min(8).max(500)).min(2).max(4),
});
```

Directions are one sentence each, distinct (different angles), realistic for the founder profile, and neutrally framed — no verdict at this stage. Verdicts come from the per-direction `SolutionResearch` agent in §4.

`lib/agents/solutions.ts`:

```ts
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/watsonx/model";
import { tools } from "@/lib/agent-tools";
import { createWatchdog } from "./watchdog";
import { steerTail, refineHead, JSON_DISCIPLINE } from "./_shared";

const solutionBriefSchema = z.object({
  feasibility:     z.string().min(10),
  differentiation: z.string().min(10),
  founderEdge:     z.string().min(5),
  aiVerdict:       z.enum(["pursue", "watch", "drop"]),
  aiReason:        z.string().min(10),
});

const solutionsSchema = z.object({
  solutions: z
    .array(z.object({
      direction: z.string().min(8),
      brief: solutionBriefSchema,
    }))
    .length(3),
});

export async function runSolutionsAgent(input: {
  problemStatement: string;
  briefSummary: string; // research's marketSignal + painEvidence + competitionNote concatenated
  founderInput: string;
  priorLabel?: string;
  maxDurationMs: number;
}) {
  const startedAt = Date.now();
  const remainingSec = () =>
    Math.max(0, Math.round((input.maxDurationMs - (Date.now() - startedAt)) / 1000));
  const watchdog = createWatchdog();

  const system =
    refineHead(input.priorLabel) +
    `You are FirstBlock's solutions agent. Given a validated problem and its research brief,
generate exactly 3 distinct solution directions for the founder to choose from.

Strategy:
- Use web_search for "who's already building this" — adjacent products, "best X tools",
  site:news.ycombinator.com, "Show HN X" launches.
- Use web_search for OSS analogues: "site:github.com <topic>", "open source X".
- (Optional) fetch_url one top competitor's homepage to characterize them precisely.
- Aim 3–6 tool calls. Solutions don't need as much depth as research.

Output requirements:
- Exactly 3 solutions.
- Each direction is a SHORT noun phrase (≤120 chars), specific, evocative.
  Good: "AI-orchestrated Double Diamond workspace with hard founder gates"
  Bad:  "An AI tool"
- Different angles: e.g. one product-led, one services-led, one platform/API.
- Verdict distribution: exactly one pursue, one watch, one drop.
- differentiation must reference real competitors or OSS projects you found via search.
- feasibility must name specific libraries, APIs, or models that make it buildable in 4–6 weeks.
- founderEdge: one concrete reason this founder/team is positioned to win it (or "none specific" if you can't find one).

${JSON_DISCIPLINE}`;

  const userMsg =
    `Problem statement:\n${input.problemStatement}\n\n` +
    `Research brief summary:\n${input.briefSummary}\n` +
    steerTail(input.founderInput) +
    `\n\nGenerate 3 solution directions.`;

  const result = await generateText({
    model,
    tools: { web_search: tools.web_search, fetch_url: tools.fetch_url },
    maxSteps: Number(process.env.AGENT_MAX_STEPS ?? 50),
    system: () =>
      system + `\n\nApprox time remaining: ${remainingSec()}s.`,
    messages: [{ role: "user", content: userMsg }],
    temperature: 0.5,
    maxOutputTokens: 2500,
    abortSignal: AbortSignal.timeout(input.maxDurationMs),
    onStepFinish: watchdog.onStepFinish,
  });

  const { object } = await generateObject({
    model,
    schema: solutionsSchema,
    messages: [
      ...result.response.messages,
      {
        role: "user",
        content:
          (watchdog.aborted()
            ? "You appear to have looped. Produce the final 3 solutions now using what you have. "
            : "Based on your research above, return the final 3 solutions now as strict JSON. ") +
          JSON_DISCIPLINE,
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 1800,
  });

  return object.solutions;
}
```

---

## 4. SolutionResearch (per-direction)

Runs once per direction emitted by `SolutionGenerator` — fired in parallel from the route. Tools: `web_search`, `research`. Produces a `SolutionBrief` with feasibility, differentiation, founder edge, and a verdict.

`lib/agents/solution-research.ts` (post-migration shape):

```ts
const solutionBriefSchema = z.object({
  feasibility:     z.string().min(10),
  differentiation: z.string().min(10),
  founderEdge:     z.string().min(5),
  aiVerdict:       z.enum(["pursue", "watch", "drop"]),
  aiReason:        z.string().min(10),
});

export async function runSolutionResearchAgent(input: {
  problemStatement: string;        // verbatim founder rawInput
  solutionDirection: string;
  compactedContext: string;
  founderProfile: OnboardingData;
  founderInput: string;            // verbatim founder steer (may be empty)
  priorLabel?: string;
  maxDurationMs: number;
}) { /* generateText({tools}) → generateObject(solutionBriefSchema) */ }
```

System prompt: `AGENT_PROMPTS.SolutionResearch`. The prompt enforces the four-area research process (existing products, build complexity/cost, differentiation gaps, case studies of similar approaches) and a verdict that explicitly accounts for the founder profile. "No clear founder edge identified" is a valid output — never pad.

Output goes into the `SolutionDocument.brief` field of the matching solution doc.

---

## 5. Scope (MVP)

No tools. Pure reasoning over the chosen direction.

`lib/agents/scope.ts`:

```ts
import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/watsonx/model";
import { steerTail, refineHead, JSON_DISCIPLINE } from "./_shared";

const schema = z.object({
  scopeIn:  z.array(z.string()).min(5).max(8),
  scopeOut: z.array(z.string()).min(5).max(8),
});

export async function runScopeAgent(input: {
  problemStatement: string;
  chosenDirection: string;
  founderInput: string;
  priorLabel?: string;
}) {
  const system =
    refineHead(input.priorLabel) +
    `You are FirstBlock's scoping agent. Define the MVP for the chosen solution.

Output requirements:
- scopeIn: 5–8 concrete features. Each item is a short imperative phrase. Total scope must be
  shippable in 2–4 weeks by a small team.
- scopeOut: 5–8 explicitly out-of-scope items. CRITICAL: these must be tempting-but-distracting —
  things a founder would naturally want to add but that would dilute the MVP. NOT random unrelated
  features.
  Good scopeOut examples: "Mobile app", "Multi-tenant collaboration", "Slack/Notion exports",
    "Auth providers beyond Google", "Self-hosted option", "Custom branding".

${JSON_DISCIPLINE}`;

  const userMsg =
    `Problem:\n${input.problemStatement}\n\n` +
    `Chosen direction:\n${input.chosenDirection}\n` +
    steerTail(input.founderInput);

  const { object } = await generateObject({
    model, schema,
    system, prompt: userMsg,
    temperature: 0.2, maxOutputTokens: 800,
  });
  return object;
}
```

---

## 6. Metrics

No tools.

`lib/agents/metrics.ts`:

```ts
import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/watsonx/model";
import { steerTail, refineHead, JSON_DISCIPLINE } from "./_shared";

const schema = z.object({
  adoption: z.string().min(10),
  value:    z.string().min(10),
  business: z.string().min(10),
});

export async function runMetricsAgent(input: {
  problemStatement: string;
  chosenDirection: string;
  founderInput: string;
  priorLabel?: string;
}) {
  const system =
    refineHead(input.priorLabel) +
    `You are FirstBlock's metrics agent. Define three success metrics for the chosen MVP.

Output requirements:
- Each metric is ONE sentence containing: a number, a unit, and an explicit timeframe.
- adoption  = activation/usage signal. Example: "200 founders complete the Problem→PRD flow within 30 days of launch."
- value     = behavior change or outcome. Example: "70% of completed flows reach the final PRD within a single session."
- business  = revenue/growth. Example: "15 paying customers ($49/mo) within 90 days of public launch."
- Targets are ambitious but realistic for the chosen MVP scope. Don't propose vanity metrics.

${JSON_DISCIPLINE}`;

  const userMsg =
    `Problem:\n${input.problemStatement}\n\n` +
    `Chosen direction:\n${input.chosenDirection}\n` +
    steerTail(input.founderInput);

  const { object } = await generateObject({
    model, schema,
    system, prompt: userMsg,
    temperature: 0.2, maxOutputTokens: 600,
  });
  return object;
}
```

---

## 7. PRD

No tools. Markdown output (no JSON schema). Use `generateText` directly.

`lib/agents/prd.ts`:

```ts
import { generateText } from "ai";
import { model } from "@/lib/watsonx/model";
import { steerTail, refineHead } from "./_shared";

export async function runPrdAgent(input: {
  problemStatement: string;
  chosenDirection: string;
  scopeIn: string[];
  scopeOut: string[];
  metrics: { adoption: string; value: string; business: string };
  founderInput: string;
  priorLabel?: string;
}) {
  const system =
    refineHead(input.priorLabel) +
    `You are FirstBlock's PRD writer. Output a complete PRD as markdown using EXACTLY this structure:

# <Product name> — PRD

## Problem statement
<paragraph>

## Target user
<paragraph: who is this for, what stage are they at>

## Goals & success metrics
<reference the Metrics block in this card; do not duplicate the numbers>

## Solution overview
<2–4 paragraphs describing the product>

## MVP feature scope
<reference the Scope block in this card>

## Out of scope
<reference the Scope block in this card>

## Development phases
<one-line: "See phases below.">

## Open questions
- <bullet 1>
- <bullet 2>
- <bullet 3>

Constraints:
- Reference the Scope and Metrics blocks instead of duplicating them — this PRD lives next to
  them in the workspace, so duplication is noise.
- Open questions must be specific and answerable; not philosophical.
- Plain markdown only. No frontmatter. No HTML.`;

  const userMsg =
    `Problem:\n${input.problemStatement}\n\n` +
    `Chosen direction:\n${input.chosenDirection}\n\n` +
    `MVP scope-in: ${input.scopeIn.join("; ")}\n` +
    `MVP scope-out: ${input.scopeOut.join("; ")}\n\n` +
    `Metrics — adoption: ${input.metrics.adoption}\n` +
    `Metrics — value: ${input.metrics.value}\n` +
    `Metrics — business: ${input.metrics.business}\n` +
    steerTail(input.founderInput) +
    `\n\nWrite the PRD now.`;

  const { text } = await generateText({
    model,
    system, prompt: userMsg,
    temperature: 0.3, maxOutputTokens: 2500,
  });
  return { fullPrd: text };
}
```

---

## 8. Phase (sequential per version)

No tools. The actual implementation runs **one PhaseAgent per version** sequentially (`v1`, `v2`, …, `complete`), each reading prior phase outputs via `executeSequential`. Each invocation produces exactly one phase block.

The doc below shows the spec's "all phases in one shot" pattern as historical reference; the live `AGENT_PROMPTS.Phase` is the per-phase shape — see `lib/agents/prompts.ts`.

`lib/agents/phases.ts`:

```ts
import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/watsonx/model";
import { JSON_DISCIPLINE } from "./_shared";

const schema = z.object({
  phases: z
    .array(
      z.object({
        order:   z.number().int().min(1).max(4),
        version: z.enum(["v1", "v2", "v3", "complete"]),
        content: z.string().min(40),
      })
    )
    .length(4),
});

export async function runPhasesAgent(input: { fullPrd: string }) {
  const system =
    `You are FirstBlock's phasing agent. Given a complete PRD, produce exactly 4 development
phases that take the product from nothing to demo-ready.

Phases (in order, fixed labels):
1. v1 — Walking Skeleton: minimum end-to-end path. Mocked dependencies OK.
2. v2 — Real Agents / Real Backend: replace mocks with real services.
3. v3 — Full Flow: every stage live, all primary user flows working.
4. complete — Demo Ready: polish, error handling, presentation.

Output requirements:
- Each phase content is markdown:
    ## <version> — <Phase name>

    - <bullet>
    - <bullet>

    **Goal:** <one sentence>
- Bullets are concrete (specific files, components, integrations).
- Each phase's Goal sentence makes the success criterion checkable.

${JSON_DISCIPLINE}`;

  const userMsg = `PRD:\n${input.fullPrd}\n\nProduce the 4 phases.`;

  const { object } = await generateObject({
    model, schema,
    system, prompt: userMsg,
    temperature: 0.3, maxOutputTokens: 1800,
  });
  return object.phases;
}
```

---

## Wiring agents to API routes

The route layer (`05-api-routes.md`) imports these functions, reads inputs from Firestore, and writes outputs back. Example glue for `solutions`:

```ts
// app/api/agents/solutions/route.ts (glue extract)
const problem  = await readProblem(uid, problemId);
const research = await readResearch(uid, problemId, researchId);
const collection = await readCollection(uid, problemId, researchId, collectionId);

const briefSummary =
  `Market: ${research.brief?.marketSignal}\n` +
  `Pain:   ${research.brief?.painEvidence}\n` +
  `Compet: ${research.brief?.competitionNote}`;

const solutions = await runSolutionsAgent({
  problemStatement: problem.cleanedStatement,
  briefSummary,
  founderInput: collection.founderInput ?? "",
  priorLabel: collection.label === "v1" ? undefined : prevLabel(collection.label),
  maxDurationMs: 280_000,
});

// Write each generated solution as its own doc under solutions/
for (const s of solutions) {
  await adminDb.collection(paths.solutions(uid, problemId, researchId, collectionId)).add({
    direction: s.direction,
    brief: s.brief,
    status: "complete",
    createdAt: FieldValue.serverTimestamp(),
    activeMvpId: null, activeMetricsId: null, activePrdId: null,
  });
}
await adminDb.doc(paths.collection(uid, problemId, researchId, collectionId)).update({
  status: "complete",
});
```

## Verifying

- For each agent, run a one-off integration test with realistic input. Eyeball the output. Specifically check:
  - Research: numbers cited with sources, no hallucinated stats, verdict consistent with evidence.
  - Solutions: 3 distinct directions, exactly one pursue/watch/drop, references real competitors/OSS.
  - Scope: scope_out items genuinely tempting (not random unrelated features).
  - Metrics: every line has a number + unit + timeframe.
  - PRD: structure matches the template; references Scope/Metrics blocks instead of duplicating.
  - Phases: exactly 4, in order, each with a concrete bullet list and a Goal line.

- If a JSON schema fails to validate (`generateObject` throws), the model output didn't match — usually a missing field or wrong enum value. Tighten the prompt's "Output requirements" rather than loosening the schema.
