# Execute 05 — Build the agent UI

## Goal

The pipeline runs end-to-end on the server (10 routes, 8 agents) but has **zero UI**. The deployed app's workspace currently shows the chat assistant + sticky notes — the agent routes are reachable only by direct API call.

After this brief: `app/(main)/workspace/page.tsx` renders a full pipeline workspace — submit a problem, run research per problem (parallel), pick a problem, generate solutions + research them in parallel, pick a solution, run scope + metrics in parallel, confirm both, write PRD, write phases sequentially. Every stage supports "regenerate with steer" and a version picker. Founder text never gets rewritten.

## Read first

- [docs/mvp/09-ui-components.md](../mvp/09-ui-components.md) — full target component map, route mapping, status rendering.
- [docs/mvp/10-pipeline-flow.md](../mvp/10-pipeline-flow.md) — gate rules + sequence + compaction.
- [docs/mvp/03-zustand-store.md](../mvp/03-zustand-store.md) — client state via Context + per-feature hooks (no Zustand).
- [docs/mvp/04-auth.md](../mvp/04-auth.md) — fetch with `credentials: "include"`; cookie carries auth.
- Current code:
  - `lib/contexts/AuthContext.tsx` — `useAuth()` already in place.
  - `hooks/useUserData.ts` — `useUserData()` already in place; surfaces `userData.onboarding`.
  - `components/ui/*` — shadcn primitives (Button, Card, Badge, Dialog, ScrollArea, Separator, Textarea, AlertDialog, Skeleton, Alert, Label, Input). Use these — don't recreate.
  - `app/(main)/workspace/page.tsx` — current implementation renders the chat assistant. Replace with the new `<Workspace />`.
  - `lib/firebase/collections.ts` — `PATHS`, `SUBCOLLECTIONS`, document interfaces. Use these for every Firestore call.

## Files to add

| Path | Purpose |
|---|---|
| `hooks/useProblems.ts` | Live listener on `users/{uid}/problems`. |
| `hooks/useResearches.ts` | `useResearches(problemId)` listener on the subcollection. |
| `hooks/useSolutionCollections.ts` | `useSolutionCollections(problemId, researchId)`. |
| `hooks/useSolutions.ts` | `useSolutions(problemId, researchId, scId)`. |
| `hooks/useMvp.ts` | `useMvp(...)` returns latest by `createdAt`. |
| `hooks/useSuccessMetrics.ts` | latest by `createdAt`. |
| `hooks/usePrd.ts` | latest by `createdAt`. |
| `hooks/usePhases.ts` | `usePhases(prdId, ...)` listener, ordered by `order` asc. |
| `lib/pipeline/gates.ts` | Pure gate functions: `canEnterSolutions`, `canEnterScope`, `canEnterPrd`, `canEnterPhases`. |
| `lib/pipeline/api.ts` | Thin `fetch` wrappers per route — `submitProblem`, `runProblemResearch`, `gateDecision`, `compact`, `generateSolutions`, `researchSolution`, `defineScope`, `defineMetrics`, `writePrd`, `writePhase`. Each calls `fetch(..., { credentials: "include", ... })`. |
| `components/workspace/Workspace.tsx` | Top-level — header + composer + problem list. |
| `components/workspace/ProblemComposer.tsx` | Textarea + submit. |
| `components/workspace/ProblemCard.tsx` | Per-problem expandable card. Mounts `useResearches`. Renders nested sections gated by selectors. |
| `components/workspace/sections/ResearchSection.tsx` | Run/regenerate research, render brief, Define gate UI. |
| `components/workspace/sections/SolutionsSection.tsx` | Generate, kick off SolutionResearch in parallel, Develop gate UI. |
| `components/workspace/sections/ScopeMetricsSection.tsx` | Run scope+metrics in parallel, founder confirm UI. |
| `components/workspace/sections/PrdSection.tsx` | Run PRD, render markdown via react-markdown. |
| `components/workspace/sections/PhasesSection.tsx` | Run phases sequentially, render the list. |
| `components/workspace/parts/VersionPicker.tsx` | Dropdown over prior versions. |
| `components/workspace/parts/SteerInput.tsx` | Textarea + submit for "Regenerate with steer". |
| `components/workspace/parts/VerdictPill.tsx` | Pursue/watch/drop badge — wraps shadcn `Badge`. |
| `components/workspace/parts/StatusRender.tsx` | Maps `running` / `complete` / `failed` to spinner / output / red box. |

## Files to edit

| Path | Change |
|---|---|
| `package.json` | `pnpm add react-markdown`. |
| `app/(main)/workspace/page.tsx` | Replace current chat-rendering body with `<Workspace />`. Keep the auth + onboarding redirect guard. |

## Files to NOT touch

- `components/chat/*`, `app/api/ai/chat/route.ts`, `app/api/ai/messages/route.ts` — chat assistant, out of scope.
- `components/sticky/*`, `app/api/sticky/route.ts`, `app/(main)/workspace/sticky/page.tsx` — sticky notes, separate page.
- `app/(main)/onboarding/page.tsx` — onboarding flow already works; don't change.
- `app/(main)/workspace/profile/page.tsx` — profile page is separate; don't reuse the workspace shell.
- `lib/contexts/AuthContext.tsx`, `hooks/useUserData.ts` — already in place.

## Steps

### Step 1 — install `react-markdown`

```bash
pnpm add react-markdown
```

Optionally `@tailwindcss/typography` if you want Tailwind's `prose` classes; otherwise use plain styling.

### Step 2 — write `lib/pipeline/api.ts`

Single file with one function per route. Pattern:

```ts
// lib/pipeline/api.ts
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`api_${res.status}: ${detail.error ?? "unknown"}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  submitProblem: (rawInput: string, inputType: "text" | "voice" = "text") =>
    post<{ success: true; problemId: string }>("/api/agents/problems", { rawInput, inputType }),

  runProblemResearch: (problemId: string, problemStatement: string) =>
    post<{ success: true; researchId: string }>("/api/agents/research-problem",
      { problemId, problemStatement }),

  gateDecision: (input: {
    problemId: string;
    researchId?: string;
    solutionCollectionId?: string;
    solutionId?: string;
    decision: { verdict: "pursue" | "watch" | "drop"; reason?: string };
  }) => post<{ success: true; gate: string; chosenId: string }>(
    "/api/agents/gate-decision", input),

  compact: (upstreamOutput: string, stage: "discover" | "define" | "develop" | "scope" | "deliver") =>
    post<{ success: true; compactedContext: string }>("/api/agents/compact", { upstreamOutput, stage }),

  generateSolutions: (problemId: string, researchId: string) =>
    post<{ success: true; solutionCollectionId: string; count: number;
           solutions: Array<{ id: string; direction: string }> }>(
      "/api/agents/generate-solutions", { problemId, researchId }),

  researchSolution: (input: {
    problemId: string; researchId: string;
    solutionCollectionId: string; solutionId: string; direction: string;
  }) => post<{ success: true }>("/api/agents/research-solution", input),

  defineScope: (input: {
    problemId: string; researchId: string;
    solutionCollectionId: string; solutionId: string;
  }) => post<{ success: true; mvpId: string }>("/api/agents/define-scope", input),

  defineMetrics: (input: { /* same as scope */ }) =>
    post<{ success: true; metricsId: string }>("/api/agents/define-metrics", input),

  writePrd: (input: {
    problemId: string; researchId: string;
    solutionCollectionId: string; solutionId: string;
    mvpId: string; metricsId: string;
  }) => post<{ success: true; prdId: string }>("/api/agents/write-prd", input),

  writePhase: (input: {
    problemId: string; researchId: string;
    solutionCollectionId: string; solutionId: string;
    prdId: string; version: string;
  }) => post<{ success: true; phaseId: string }>("/api/agents/write-phase", input),
};
```

### Step 3 — write per-feature hooks

Pattern (copy for each subcollection):

```ts
// hooks/useResearches.ts
"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PATHS, type ResearchDocument } from "@/lib/firebase/collections";
import { useAuth } from "@/lib/contexts/AuthContext";

export function useResearches(problemId: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<ResearchDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !problemId) { setItems([]); setLoading(false); return; }
    const q = query(
      collection(db, PATHS.researches(user.uid, problemId)),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => d.data() as ResearchDocument));
      setLoading(false);
    });
  }, [user, problemId]);

  return { researches: items, loading };
}
```

For "latest only" hooks (`useMvp`, `useSuccessMetrics`, `usePrd`), still subscribe to the full subcollection (so VersionPicker can switch) and pick the active id from React state in the consuming component.

### Step 4 — write gate selectors

```ts
// lib/pipeline/gates.ts
import type {
  ResearchDocument, SolutionDocument,
  MVPDocument, SuccessMetricsDocument, PRDDocument,
} from "@/lib/firebase/collections";

export const canEnterSolutions = (r?: ResearchDocument | null) =>
  r?.founderDecision?.verdict === "pursue";

export const canEnterScopeMetrics = (s?: SolutionDocument | null) =>
  s?.founderDecision?.verdict === "pursue";

export const canEnterPrd = (
  mvp?: MVPDocument | null, m?: SuccessMetricsDocument | null,
) => mvp?.founderConfirmed === true && m?.founderConfirmed === true;

export const canEnterPhases = (prd?: PRDDocument | null) =>
  prd?.status === "complete";
```

### Step 5 — build `Workspace.tsx`

```tsx
"use client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useProblems } from "@/hooks/useProblems";
import { ProblemComposer } from "./ProblemComposer";
import { ProblemCard } from "./ProblemCard";

export function Workspace() {
  const { user, signOut } = useAuth();
  const { problems, loading } = useProblems();

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-xl font-semibold">FirstBlock</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{user?.email}</span>
          <button onClick={signOut} className="hover:text-foreground">Sign out</button>
        </div>
      </header>

      <ProblemComposer />

      <section className="space-y-4">
        {problems.map((p) => (
          <ProblemCard key={p.id} problemId={p.id} />
        ))}
        {problems.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Submit a problem above to start.
          </p>
        )}
      </section>
    </main>
  );
}
```

### Step 6 — replace `app/(main)/workspace/page.tsx` body

Keep the auth + onboarding redirect (look at the existing file before editing). Replace the chat-rendering body with `<Workspace />`. The chat assistant remains accessible at its own route if you want to keep it linked — otherwise remove the link.

### Step 7 — build `ProblemComposer.tsx`

Textarea (uses `<Textarea />` from `components/ui/textarea`) + submit button. On submit:

```ts
async function onSubmit(rawInput: string) {
  if (!rawInput.trim()) return;
  setBusy(true);
  try {
    await api.submitProblem(rawInput);
    setText("");
  } finally { setBusy(false); }
}
```

The route stores `rawInput` verbatim. Show the founder's exact text in the new card's header.

### Step 8 — build `ProblemCard.tsx`

```tsx
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useResearches } from "@/hooks/useResearches";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ResearchSection } from "./sections/ResearchSection";
import { SolutionsSection } from "./sections/SolutionsSection";
import { canEnterSolutions } from "@/lib/pipeline/gates";

export function ProblemCard({ problemId }: { problemId: string }) {
  const { user } = useAuth();
  const { researches } = useResearches(problemId);
  const [activeResearchId, setActiveResearchId] = useState<string | null>(null);

  // Default active = latest by createdAt
  const latest = researches.at(-1);
  const activeResearch = activeResearchId
    ? researches.find((r) => r.id === activeResearchId) ?? latest
    : latest;

  if (!user) return null;
  return (
    <Card>
      <CardHeader>
        {/* Render the parent problem's rawInput verbatim. Fetch once via direct firestore or
            a useProblem(problemId) hook — keep it simple. */}
      </CardHeader>
      <CardContent className="space-y-6">
        <ResearchSection
          problemId={problemId}
          researches={researches}
          activeResearchId={activeResearch?.id ?? null}
          onPickVersion={setActiveResearchId}
        />
        {canEnterSolutions(activeResearch) && activeResearch && (
          <SolutionsSection
            problemId={problemId}
            researchId={activeResearch.id}
          />
        )}
      </CardContent>
    </Card>
  );
}
```

### Step 9 — build the four section components

Each section follows the same shape:

```
1. Header with stage name + VersionPicker (shows when >1 version)
2. Status render (running/complete/failed)
3. If complete: stage-specific output renderer
4. If complete and gate not yet decided: gate UI (e.g. Pursue/Watch/Drop buttons)
5. SteerInput at the bottom
```

**ResearchSection** — Run/regenerate calls `api.runProblemResearch(problemId, problem.rawInput)`. After complete, three buttons (`Pursue`, `Watch`, `Drop`) call `api.gateDecision({ problemId, researchId, decision: { verdict, reason } })`. After gate decision, optionally fire compaction + persist `compactedContext` to the research doc.

**SolutionsSection** — On "Generate solutions", call `api.generateSolutions(problemId, researchId)` → backend creates a `solutionCollections` doc + N `solutions` (status `pending`, no brief yet). Then for each `solutionId`, call `api.researchSolution(...)` in `Promise.all` to fill briefs. Show a grid of solution cards with their briefs + per-card Pursue/Watch/Drop. The first solution to receive a Pursue verdict is the chosen one.

**ScopeMetricsSection** — Two parallel calls: `api.defineScope(...)` + `api.defineMetrics(...)`. Render the resulting MVP and SuccessMetrics docs side by side. Each has a `Confirm` button that writes `founderConfirmed: true` directly via the client SDK (`updateDoc` on the doc), with optional founder edits.

**PrdSection** — Single call `api.writePrd(...)` after both confirms. Render `prd.fullPrd` with `<ReactMarkdown>`.

**PhasesSection** — After PRD is complete, sequentially call `api.writePhase(...)` for `version` in `["v1", "v2", "complete"]` (or whatever versions you want). Each call passes the prior phase output via the route — the route's executor handles `previousPhases` threading. Render the list of phase blocks as markdown.

### Step 10 — wire SteerInput

A tiny component:

```tsx
"use client";
export function SteerInput({ onSubmit, disabled }: {
  onSubmit: (text: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try { await onSubmit(text); setText(""); }
      finally { setBusy(false); }
    }} className="flex items-end gap-2">
      <Textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Steer this regenerate (optional)…" disabled={disabled || busy} />
      <Button type="submit" disabled={disabled || busy}>Regenerate</Button>
    </form>
  );
}
```

Founder text is passed verbatim to `api.runProblemResearch` / etc.; the route should accept an optional `founderInput` field and pass it into the agent's user message via the `steerTail` helper.

### Step 11 — VersionPicker

```tsx
function VersionPicker<T extends { id: string; createdAt: Date }>({
  versions, activeId, onPick,
}: { versions: T[]; activeId: string | null; onPick: (id: string) => void }) {
  if (versions.length <= 1) return null;
  return (
    <select
      value={activeId ?? versions.at(-1)!.id}
      onChange={(e) => onPick(e.target.value)}
      className="text-xs bg-transparent border rounded px-2 py-1"
    >
      {[...versions].reverse().map((v, i) => {
        const label = `v${versions.length - i}`;
        const created = v.createdAt instanceof Date ? v.createdAt : (v.createdAt as { toDate?: () => Date }).toDate?.() ?? new Date();
        return (
          <option key={v.id} value={v.id}>{label} · {timeAgo(created)}</option>
        );
      })}
    </select>
  );
}

function timeAgo(d: Date): string {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
```

`activeId` is local React state in the section — Firestore stays untouched. Selecting a non-latest version only affects what's rendered; downstream sections continue to read the latest doc.

### Step 12 — VerdictPill

Wraps shadcn `Badge`:

```tsx
import { Badge } from "@/components/ui/badge";

export function VerdictPill({ verdict }: { verdict: "pursue" | "watch" | "drop" }) {
  const variant = verdict === "pursue" ? "default" : verdict === "watch" ? "secondary" : "destructive";
  return <Badge variant={variant}>{verdict.toUpperCase()}</Badge>;
}
```

### Step 13 — StatusRender (and re-renders for failed state)

Compose:
- `running` → Spinner (`<Loader2 className="animate-spin" />` from `lucide-react`) + descriptive label.
- `complete` → render the stage's output (passed as `children`).
- `failed` → `<Alert variant="destructive">` with `errorMessage` + Retry button.

## Founder-input rules (do not violate)

1. Display `problem.rawInput` verbatim — never run it through any transform on the client.
2. Pass `founderInput` from `<SteerInput />` verbatim into the API call body.
3. Never display `cleanedStatement` (it shouldn't exist after brief 01; if it does, treat as empty).
4. `chosenReason` and `founderEdits` from the gate/confirm UIs are also verbatim — sanitization happens server-side, no client-side rewriting.

## Don't touch

- `components/chat/*`, `app/api/ai/chat/route.ts`, `components/sticky/*`, `app/api/sticky/*` — out of scope.
- `app/(main)/onboarding/*`, `app/(main)/workspace/profile/*`, `app/(main)/workspace/sticky/*` — separate pages, independent.
- `lib/utils/rateLimit.ts`, `lib/utils/sanitize.ts` — server-side, no UI impact.
- Existing shadcn primitives (`components/ui/*`) — use, don't recreate.

## Verification

```bash
# 1. Files exist
ls components/workspace/Workspace.tsx components/workspace/ProblemComposer.tsx
ls components/workspace/ProblemCard.tsx
ls components/workspace/sections/{Research,Solutions,ScopeMetrics,Prd,Phases}Section.tsx
ls components/workspace/parts/{VersionPicker,SteerInput,VerdictPill,StatusRender}.tsx
ls hooks/use{Problems,Researches,SolutionCollections,Solutions,Mvp,SuccessMetrics,Prd,Phases}.ts

# 2. TS clean
pnpm tsc --noEmit
pnpm lint

# 3. End-to-end demo
pnpm dev
# Sign in. Complete onboarding. Reach /workspace.
# Submit a problem with a real-world prompt:
#   "Solo founders can't keep AI coding tools' contexts in sync across machines"
# Card appears, rawInput shown verbatim.
# Click "Run research" → spinner → 30-120s → brief renders with REAL urls
#   (not the stub text from before brief 03).
# Pursue. Solutions section renders.
# "Generate solutions" → 2-4 solution cards appear, each running SolutionResearch
#   in parallel. After ~60s each card has a brief.
# Pick one. Scope + Metrics run in parallel.
# Confirm both. Run PRD. Markdown renders.
# Run phases sequentially (one click per version). Each phase block appears.
# Refresh page → all state restored from Firestore.
# Regenerate research with steer "focus on Mac users". New v2 appears.
# VersionPicker switches between v1 and v2.

# 4. Founder-input integrity
# In Firestore Console, the problem's rawInput equals exactly what you typed.
# No "cleaned" version anywhere.
```

## Why this is brief 05

This is the largest brief because it's the most concrete deliverable. It depends on brief 02 (typed agent outputs that map directly to Firestore documents) and brief 03 (real research that produces meaningful briefs to render). Brief 04 (watchdog) feeds the `errorMessage` field that StatusRender displays on failed stages. With all four prior briefs landed, this brief is purely UI work — no backend changes.
