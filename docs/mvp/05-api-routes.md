# 05 — API Routes

The actual route surface is wider than the seven-route spec because the live implementation splits responsibilities differently:

- `clean-problem` does **not** exist (founder input is never AI-rewritten).
- Solution generation is split into two routes (`generate-solutions` then `research-solution` per direction).
- `gate-decision` and `compact` are dedicated routes.
- A `problems` route handles raw problem submission.

All routes follow: verify auth + CSRF → validate body (Zod) → look up Firestore docs (Admin SDK) → run agent → write result back → return JSON `{ success: true, ...metadata }`.

The browser's Firestore listener delivers the stage doc; the API response carries metadata and a success flag.

## Route inventory

| Route | Body | Effect on Firestore | Agent(s) |
|---|---|---|---|
| `POST /api/agents/problems` | `{ rawInput, inputType }` | create `problems/{id}` with verbatim `rawInput` | none |
| `GET  /api/agents/problems` | — | list user's problems | none |
| `POST /api/agents/research-problem` | `{ problemId, problemStatement }` | create `researches/{rid}`, set `brief` + `status` | ProblemResearch |
| `POST /api/agents/gate-decision` | `{ problemId, researchId?, solutionCollectionId?, solutionId?, decision }` | set `founderDecision` on the right doc | none |
| `POST /api/agents/compact` | `{ upstreamOutput, stage }` | returns compactedContext (route does not auto-write; caller decides where to save) | ContextCompactor |
| `POST /api/agents/generate-solutions` | `{ problemId, researchId }` | create `solutionCollections/{cid}` + N `solutions/{sid}` (direction only) | SolutionGenerator |
| `POST /api/agents/research-solution` | `{ problemId, researchId, solutionCollectionId, solutionId, direction }` | set `brief` + `status` on the solution | SolutionResearch |
| `POST /api/agents/define-scope` | `{ problemId, researchId, solutionCollectionId, solutionId }` | create `mvps/{mvpId}` | Scope |
| `POST /api/agents/define-metrics` | same as scope | create `successMetrics/{smId}` | Metrics |
| `POST /api/agents/write-prd` | `{ problemId, researchId, solutionCollectionId, solutionId, mvpId, metricsId }` | create `prds/{prdId}` | PRDWriter |
| `POST /api/agents/write-phase` | `{ problemId, researchId, solutionCollectionId, solutionId, prdId, version }` | create `phases/{phaseId}` | Phase |

The orchestration choice that callers make: scope/metrics are independent, can be fired in parallel; phases must be sequential (each reads prior phases via `executeSequential`). Compaction is its own call so the client (or a higher-level orchestrator) can decide when to compact and where to persist the output.

## Body schemas

Live in `lib/utils/validators.ts`:

```ts
export const problemInputSchema = z.object({
  rawInput: z.string().min(1).max(2000),
  inputType: z.enum(["text", "voice"]).default("text"),
});

export const problemResearchRequestSchema = z.object({
  problemId: z.string().min(1),
  problemStatement: z.string().min(1).max(2000),
});

export const compactRequestSchema = z.object({
  upstreamOutput: z.string().min(1).max(50000),
  stage: z.enum(["discover", "define", "develop", "scope", "deliver"]),
});

export const solutionGenerateRequestSchema = z.object({
  problemId: z.string().min(1),
  researchId: z.string().min(1),
});

export const solutionResearchRequestSchema = z.object({
  problemId: z.string().min(1),
  researchId: z.string().min(1),
  solutionCollectionId: z.string().min(1),
  solutionId: z.string().min(1),
  direction: z.string().min(1).max(500),
});

export const scopeRequestSchema = z.object({
  problemId: z.string().min(1),
  researchId: z.string().min(1),
  solutionCollectionId: z.string().min(1),
  solutionId: z.string().min(1),
});
export const metricsRequestSchema = scopeRequestSchema;

export const prdWriteRequestSchema = scopeRequestSchema.extend({
  mvpId: z.string().min(1),
  metricsId: z.string().min(1),
});

export const phaseWriteRequestSchema = scopeRequestSchema.extend({
  prdId: z.string().min(1),
  version: z.string().min(1).max(20),
});

export const gateDecisionRequestSchema = z.object({
  problemId: z.string().min(1),
  researchId: z.string().min(1).optional(),
  solutionCollectionId: z.string().min(1).optional(),
  solutionId: z.string().min(1).optional(),
  decision: z.object({
    verdict: z.enum(["pursue", "watch", "drop"]),
    reason: z.string().max(500).optional(),
  }),
});
```

## Route handler skeleton

Every route reuses the same skeleton. Live example: `app/api/agents/research-problem/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { problemResearchRequestSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { parseProblemBrief } from "@/lib/agents/parsers";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const validation = problemResearchRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }
    const { problemId, problemStatement } = validation.data;

    // Verify ownership
    const problemRef = adminDb.doc(PATHS.problem(userId, problemId));
    if (!(await problemRef.get()).exists) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    // Founder profile
    const userDoc = await adminDb.doc(PATHS.user(userId)).get();
    const founderProfile = userDoc.data()?.onboarding || null;

    // Create stage doc with running status
    const researchRef = adminDb.collection(PATHS.researches(userId, problemId)).doc();
    await researchRef.set({
      id: researchRef.id,
      createdAt: FieldValue.serverTimestamp(),
      status: "running",
      brief: { /* placeholders */ },
      founderDecision: null,
      compactedContext: "",
    });

    // Run agent
    const sanitized = sanitizeText(problemStatement, 2000);
    const results = await AgentRouter.researchProblems(
      [{ id: problemId, cleanedStatement: sanitized }],
      founderProfile,
      undefined,
      userId
    );
    const result = results[0];

    if (!result.success) {
      await researchRef.update({ status: "failed" });
      return NextResponse.json({ error: "Research failed", detail: result.error }, { status: 500 });
    }

    const brief = parseProblemBrief(result.output);
    await researchRef.update({ status: "complete", brief });

    return NextResponse.json({ success: true, researchId: researchRef.id, brief, metadata: result.metadata });
  } catch (error) {
    const err = error as Error;
    if (err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err.message.includes("CSRF")) return NextResponse.json({ error: err.message }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

The `AgentRouter.researchProblems` shape (and the per-route variants `generateSolutions`, `researchSolutions`, `defineScopeAndMetrics`, `writePRD`, `writePhases`) lives in `lib/agents/router.ts`.

> **After `docs/execute/02-watsonx-ai-sdk-migration.md` lands**, the `parseProblemBrief` parsers are deleted — `AgentRouter` returns typed objects directly via `generateObject` + Zod schemas, and the route writes them to Firestore without a parsing step.

## Per-route considerations

| Route | Notes |
|---|---|
| `problems` (POST) | No agent. Just sanitize `rawInput` and create the doc. **`cleanedStatement` is set to `""`** — no AI rewriting. |
| `research-problem` | Uses `parseProblemBrief` to extract structured fields from the agent's text output. After AI-SDK migration, switch to direct Zod object. |
| `generate-solutions` | Calls `parseSolutionDirections` to extract N + directions. Creates one `solution` doc per direction with empty `brief` (status `pending` — note: not in the formal `AgentStatus` enum, treat as pre-`running`). |
| `research-solution` | Should be called once per solution, ideally in parallel from the client. Updates the existing solution doc. |
| `define-scope` / `define-metrics` | Independent — fire in parallel from the client. Each creates a new doc in its own subcollection. |
| `write-prd` | Reads the chosen `mvpId` and `metricsId` (founder picked), runs PRDWriter, stores `fullPrd` plus refs to source MVP/Metrics. |
| `write-phase` | Run sequentially per version (`v1`, `v2`, `complete`, …). Each phase reads prior phases via the executor's `executeSequential` mode. |
| `gate-decision` | Pure write, no agent. Branches on which IDs are present (`solutionId` → Develop gate; `researchId` only → Define gate). |
| `compact` | Returns the compacted text in the response body — caller persists it (e.g. updates `research.compactedContext` or `solutionCollection.compactedContext`). |

## Per-route maxDuration

Add at the top of each route file when running on Vercel; defaults are fine for Code Engine.

```ts
export const runtime = "nodejs";
export const maxDuration = 300;  // research-problem, research-solution, generate-solutions
export const maxDuration = 90;   // write-prd, write-phase
export const maxDuration = 60;   // define-scope, define-metrics, compact
export const maxDuration = 30;   // problems, gate-decision
```

## Error responses

```ts
// 400 — body validation failed
{ error: "Invalid input", details: [...] }
// 401 — auth (thrown by requireAuth)
{ error: "Unauthorized" }
// 403 — CSRF (thrown by requireAuth)
{ error: "Invalid origin - CSRF protection" }
// 404 — referenced docs don't exist
{ error: "<doc> not found" }
// 500 — agent threw
{ error: "<stage> failed", detail: "..." }
```

The route patches the relevant doc's `status: "failed"` before returning 500 so the UI listener can render an error state without parsing the response body.

## Verifying

1. Sign in via the UI to set the `__session` cookie.
2. From DevTools → Application → Cookies, copy `__session`.
3. Cold-test each route with curl (set `Cookie: __session=...` and `Origin: http://localhost:3000`).
4. After each call, refresh Firestore Console and inspect the doc — `status: "complete"` and the expected fields populated.
5. Force a failure (unset `WATSONX_API_KEY` temporarily) — verify the doc gets `status: "failed"` and the route returns 500.
