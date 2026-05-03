# 09 — UI Components

> **Status:** None of the agent-pipeline UI exists yet. The deployed app currently shows a chat assistant + sticky notes + onboarding. Building the workspace + per-stage sections is `docs/execute/05-agent-ui.md`. This doc is the target spec for what gets built.

## Component map

```
components/
  workspace/
    Workspace.tsx                ← top-level after sign-in + onboarding
    ProblemComposer.tsx          ← raw-input form, submits to /api/agents/problems
    ProblemCard.tsx              ← per-problem expandable card
  workspace/sections/
    ResearchSection.tsx          ← Run research, render brief, Define gate UI
    SolutionsSection.tsx         ← Generate solutions, parallel SolutionResearch, Develop gate UI
    ScopeMetricsSection.tsx      ← Run Scope + Metrics in parallel, founder confirm
    PrdSection.tsx               ← Run PRD, render markdown, Run phases
    PhasesSection.tsx            ← list of phase blocks
  workspace/parts/
    VersionPicker.tsx            ← dropdown for prior versions of a stage
    SteerInput.tsx               ← textarea + submit for "Regenerate with steer"
    VerdictPill.tsx              ← pursue/watch/drop badge (use existing shadcn Badge)
    Spinner.tsx                  ← (existing shadcn Skeleton or Lucide Loader2 spin)
```

The existing shadcn primitives (`components/ui/*`) cover Button, Card, Dialog, Badge, ScrollArea, Separator, Textarea, AlertDialog — use them; don't recreate.

## Workspace shell

`components/workspace/Workspace.tsx`:

```tsx
"use client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { useProblems } from "@/hooks/useProblems";
import { ProblemComposer } from "./ProblemComposer";
import { ProblemCard } from "./ProblemCard";

export function Workspace() {
  const { user, signOut } = useAuth();
  const { userData } = useUserData();
  const { problems } = useProblems();

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">FirstBlock</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{user?.email}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <ProblemComposer />

      <section className="space-y-4">
        {problems.map((p) => (
          <ProblemCard key={p.id} problemId={p.id} />
        ))}
      </section>
    </main>
  );
}
```

The workspace mounts on `app/(main)/workspace/page.tsx`, which is already gated by middleware behind the `__session` cookie. Add a guard in the page component to redirect to `/onboarding` if `userData?.onboardingCompleted === false`.

## ProblemComposer

```tsx
async function onSubmit(rawInput: string) {
  const res = await fetch("/api/agents/problems", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawInput, inputType: "text" }),
  });
  if (!res.ok) throw new Error("Failed to submit problem");
  // Listener picks up the new problem doc; nothing to do client-side.
}
```

**No clean-problem call.** The route stores `rawInput` verbatim. Show the founder's exact text in the card header.

## ProblemCard

```tsx
"use client";
import { useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useResearches } from "@/hooks/useResearches";
import { ResearchSection } from "./sections/ResearchSection";

export function ProblemCard({ problemId }: { problemId: string }) {
  const { user } = useAuth();
  const { researches } = useResearches(problemId);

  if (!user) return null;
  return (
    <Card>
      <CardHeader>{/* show problem.rawInput verbatim */}</CardHeader>
      <CardContent>
        <ResearchSection problemId={problemId} researches={researches} />
        {/* SolutionsSection / ScopeMetricsSection / PrdSection nest here, gated */}
      </CardContent>
    </Card>
  );
}
```

The card renders nested stage sections in order. Each section consults its parent state (via gate selectors — see `10-pipeline-flow.md`) to decide whether to render itself or remain hidden.

## Stage section pattern

Every stage section follows the same shape:

```tsx
function ResearchSection({ problemId, researches }: Props) {
  const latest = researches.at(-1);  // latest by createdAt
  const [busy, setBusy] = useState(false);

  async function onRun(founderInput: string) {
    setBusy(true);
    try {
      const problem = await fetchProblem(problemId);  // small util
      await fetch("/api/agents/research-problem", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, problemStatement: problem.rawInput }),
      });
    } finally { setBusy(false); }
  }

  return (
    <section>
      <VersionPicker versions={researches} />
      {latest?.status === "running" && <Spinner label="Researching the web…" />}
      {latest?.status === "complete" && <BriefRender brief={latest.brief} />}
      {latest?.status === "failed" && <FailedRender doc={latest} onRetry={onRun} />}
      {!latest && <Button onClick={() => onRun("")}>Run research</Button>}
      {latest?.status === "complete" && (
        <DefineGateActions
          problemId={problemId}
          researchId={latest.id}
          founderDecision={latest.founderDecision}
        />
      )}
    </section>
  );
}
```

## Route call mapping

| Stage section | Endpoint | Body shape |
|---|---|---|
| Composer (submit) | `POST /api/agents/problems` | `{ rawInput, inputType }` |
| Research (run/regenerate) | `POST /api/agents/research-problem` | `{ problemId, problemStatement }` |
| Define gate (pursue/watch/drop) | `POST /api/agents/gate-decision` | `{ problemId, researchId, decision }` |
| (between Define and Develop) | `POST /api/agents/compact` then write to `research.compactedContext` | `{ upstreamOutput, stage: "define" }` |
| Solutions (generate) | `POST /api/agents/generate-solutions` | `{ problemId, researchId }` |
| Solutions (research each direction) | `POST /api/agents/research-solution` × N parallel | `{ problemId, researchId, solutionCollectionId, solutionId, direction }` |
| Develop gate | `POST /api/agents/gate-decision` | `{ problemId, researchId, solutionCollectionId, solutionId, decision }` |
| (between Develop and Scope) | `POST /api/agents/compact` | `{ upstreamOutput, stage: "develop" }` |
| Scope/Metrics (parallel) | `POST /api/agents/define-scope` + `POST /api/agents/define-metrics` | scope/metrics request shape |
| Founder confirm Scope/Metrics | direct Firestore write to `mvp.founderConfirmed` / `successMetrics.founderConfirmed` | — |
| (between Scope and Deliver) | `POST /api/agents/compact` | `{ upstreamOutput, stage: "scope" }` |
| Write PRD | `POST /api/agents/write-prd` | `{ ..., mvpId, metricsId }` |
| Write phases (sequential) | `POST /api/agents/write-phase` × N | `{ ..., prdId, version }` |

## "Regenerate with steer" UX

Each section has a `<SteerInput />` below the rendered output. On submit:

```ts
async function onRegenerate(founderInput: string) {
  setBusy(true);
  try {
    // Just call the same route again — it creates a new sibling doc with createdAt now.
    await fetch(`/api/agents/${stage.routeName}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parentIds, founderInput }),
    });
    // Listener delivers the new doc; latest-by-createdAt picks it up.
  } finally { setBusy(false); }
}
```

The route should accept `founderInput` and pass it verbatim into the agent's prompt (see `08-agent-prompts.md` — `steerTail` helper). The founder's text is never paraphrased.

## VersionPicker

When a subcollection has more than one doc, show a small picker. Selecting a non-latest version renders that version's output; the next stage section continues to read the latest.

```tsx
function VersionPicker<T extends { id: string; createdAt: Date }>({
  versions, activeId, onPick,
}: { versions: T[]; activeId: string | null; onPick: (id: string) => void }) {
  if (versions.length <= 1) return null;
  return (
    <select value={activeId ?? versions.at(-1)!.id} onChange={(e) => onPick(e.target.value)}
      className="text-xs bg-transparent border rounded px-2 py-1">
      {[...versions].reverse().map((v, i) => (
        <option key={v.id} value={v.id}>v{versions.length - i} · {timeAgo(v.createdAt)}</option>
      ))}
    </select>
  );
}
```

`activeId` is local React state in the section — not Firestore. It only affects which doc gets rendered; downstream sections always read latest.

## Status rendering

| Status | UI |
|---|---|
| absent | Just the "Run" button |
| `running` | `<Spinner />` + descriptive label ("Researching the web…", "Generating solutions…", etc.) |
| `complete` | Full output — brief, solutions list, scope/metrics, PRD markdown, phases |
| `failed` | Red `Alert` with `errorMessage` + "Retry" button (calls `onRegenerate`) |

Use `VerdictPill` for `aiVerdict` and `founderDecision.verdict` rendering at every stage.

## PRD markdown rendering

```tsx
import ReactMarkdown from "react-markdown";

<div className="prose prose-zinc dark:prose-invert max-w-none">
  <ReactMarkdown>{prd.fullPrd}</ReactMarkdown>
</div>
```

Add `react-markdown@^9` to deps. If `prose` styling is missing without `@tailwindcss/typography`, fall back to `whitespace-pre-wrap font-mono text-sm` for the demo.

## Verifying

After all sections are wired (per `docs/execute/05-agent-ui.md`):

1. Sign in. Complete onboarding. Reach `/workspace`.
2. Submit a problem. Card appears, `rawInput` shown verbatim (no AI rewriting).
3. Click **Run research** → spinner → after 30–120s, brief renders with verdict pill.
4. Click **Pursue**. Solutions section unfolds.
5. Click **Generate solutions** → N solution cards render, each running SolutionResearch in parallel. Pick one.
6. Run scope + metrics (parallel). Confirm both. Run PRD. Run phases sequentially.
7. Regenerate research with steer "focus on enterprise". Confirm a new version appears in the VersionPicker. Pick the prior version — earlier brief renders.
8. Force a failure (DevTools intercept) → red box → click Retry → new sibling doc, no leftover "running" state.
