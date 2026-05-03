# 03 — Client State (no Zustand)

> **Renamed in spirit:** the original spec proposed Zustand. The actual app uses **React Context + per-feature hooks + Firestore live listeners** — no Zustand store. This doc covers that model. The filename stays `03-zustand-store.md` for link stability.

## Strategy

- **Source of truth: Firestore.** Every read is a `onSnapshot` listener; every write goes through an API route or the client SDK using `lib/firebase/collections.ts` `PATHS`.
- **Three pieces of cross-cutting client state:**
  1. **AuthContext** (`lib/contexts/AuthContext.tsx`) — Firebase user + auth methods (`signIn`, `signUp`, `signInWithGoogle`, `signOut`, `resetPassword`).
  2. **`useUserData`** (`hooks/useUserData.ts`) — real-time Firestore listener on `users/{uid}` to surface onboarding profile + project state.
  3. **Per-feature hooks** for the pipeline — one per stage section (see "Pipeline hooks" below).
- **No global pipeline store.** Each `ProblemCard`, `ResearchSection`, `SolutionsSection`, `ScopeMetricsSection`, `PrdSection` mounts its own subcollection listener inside `useEffect` and unmounts it on tear-down. This keeps the data near the component and avoids prop-drilling.

## Existing hooks

```
hooks/
  useUserData.ts   ← real-time onSnapshot on users/{uid}
  useChat.ts       ← out-of-pipeline (chat assistant)
  useSticky.ts     ← out-of-pipeline (sticky notes)
```

`useUserData` shape:

```ts
const { userData, loading, error } = useUserData();
// userData: UserDocument | null  (includes onboarding subobject)
```

## Pipeline hooks (to be added by docs/execute/05-agent-ui.md)

Each pipeline stage gets its own hook that mounts a Firestore listener and returns a typed slice. Pattern:

```tsx
// hooks/useProblems.ts
"use client";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PATHS } from "@/lib/firebase/collections";
import type { ProblemDocument } from "@/lib/firebase/collections";
import { useAuth } from "@/lib/contexts/AuthContext";

export function useProblems(): { problems: ProblemDocument[]; loading: boolean } {
  const { user } = useAuth();
  const [problems, setProblems] = useState<ProblemDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProblems([]); setLoading(false); return; }
    const q = query(collection(db, PATHS.problems(user.uid)), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      setProblems(snap.docs.map((d) => d.data() as ProblemDocument));
      setLoading(false);
    });
  }, [user]);

  return { problems, loading };
}
```

Companion hooks (one per subcollection — implement when the corresponding section UI is built):

| Hook | Subcollection | Usage |
|------|---------------|-------|
| `useProblems()` | `problems/` | Workspace top-level list |
| `useResearches(problemId)` | `researches/` | Inside `ProblemCard` |
| `useSolutionCollections(problemId, researchId)` | `solutionCollections/` | After Define gate |
| `useSolutions(problemId, researchId, scId)` | `solutions/` | Solutions grid |
| `useMvp(problemId, researchId, scId, solId)` | `mvps/` (latest) | Scope section |
| `useSuccessMetrics(...)` | `successMetrics/` (latest) | Metrics section |
| `usePrd(...)` | `prds/` (latest) | PRD section |
| `usePhases(prdId, ...)` | `phases/` | Phase list |

For "latest" hooks, sort by `createdAt desc` and take `[0]`.

## Mutation patterns

**Agent runs:** call API routes via `fetch` with `credentials: "include"` (the `__session` cookie carries the auth token, set by `AuthContext`):

```ts
async function runProblemResearch(problemId: string, rawInput: string) {
  const res = await fetch("/api/agents/research-problem", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problemId, problemStatement: rawInput }),
  });
  if (!res.ok) throw new Error(`research failed: ${res.status}`);
  return res.json() as Promise<{ success: true; researchId: string }>;
}
```

After the route returns, the listener delivers the new doc — the UI re-renders without further client work.

**Founder gate decisions:** `POST /api/agents/gate-decision` with `{ problemId, researchId | solutionCollectionId, solutionId?, decision: { verdict, reason } }`. The route writes `founderDecision` server-side.

**Founder confirmations on MVP/Metrics:** write directly via the client SDK (the path is owner-scoped):

```ts
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PATHS } from "@/lib/firebase/collections";

await updateDoc(doc(db, PATHS.mvp(uid, pid, rid, scId, solId, mvpId)), {
  founderConfirmed: true,
  founderEdits: edits,        // verbatim
  confirmedAt: serverTimestamp(),
});
```

The Firestore listener picks up the change and the UI gates the next stage.

## Why no Zustand

The pipeline tree is deep (`problems → researches → solutionCollections → solutions → mvps/metrics/prds → phases`) but **rendered shallowly** — only one branch is expanded at a time. A global typed cache would mostly mirror what `onSnapshot` already gives us at the section level. Per-feature hooks keep the listeners scoped to mount/unmount and avoid the upsert/patch/selector ceremony of a normalized store.

If a cross-section view emerges later (e.g. "all problems with a pursue verdict across all research versions"), a thin Zustand slice can be added without changing the per-section hooks — they remain correct.

## Verifying

After wiring (per `docs/execute/05-agent-ui.md`):
1. Sign in. The workspace renders with `useProblems()` — shows empty state.
2. Submit a problem. The new doc appears in the list within ~200 ms (Firestore latency).
3. Open Firestore Console → manually delete the doc → it disappears from the UI within ~1 s.
4. Refresh the page → state restores from Firestore (no client cache to seed).
5. React DevTools shows the per-section hooks mounted only on expanded cards.
