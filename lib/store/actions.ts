// Pipeline mutation actions. Every UI mutation goes through here.
//
// Each action is a thin fetch wrapper around an API route. They never write
// Firestore directly — the route does that, then the snapshot listeners in
// the store deliver the new state. This keeps the data flow one-directional:
//
//   UI -> action -> API route -> Firestore -> onSnapshot -> store -> UI

import type { Verdict } from "@/lib/firebase/collections";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(data.error ?? `${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(data.error ?? `${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Discover ─────────────────────────────────────────────────────

export const submitProblem = (input: { rawInput: string; folder?: string }) =>
  post<{ success: true; problem: { id: string } }>(
    "/api/agents/problems",
    { rawInput: input.rawInput, inputType: "text", ...(input.folder ? { folder: input.folder } : {}) }
  ).then((r) => r.problem.id);

export const updateProblem = (
  problemId: string,
  patchData: { title?: string; folder?: string }
) =>
  patch<{ success: true }>(`/api/agents/problems/${problemId}`, patchData);

// ─── Define ───────────────────────────────────────────────────────

export const startProblemResearch = (input: {
  problemId: string;
  rawInput: string;
}) =>
  post<{ researchId: string; runId: string }>(
    "/api/research/start",
    { problemId: input.problemId, problemStatement: input.rawInput }
  );

export const decideGate = (input: {
  problemId: string;
  researchId?: string;
  solutionCollectionId?: string;
  solutionId?: string;
  verdict: Verdict;
  reason?: string;
}) =>
  post<{ success: true; gate: string; chosenId: string }>(
    "/api/agents/gate-decision",
    {
      problemId: input.problemId,
      ...(input.researchId ? { researchId: input.researchId } : {}),
      ...(input.solutionCollectionId
        ? { solutionCollectionId: input.solutionCollectionId }
        : {}),
      ...(input.solutionId ? { solutionId: input.solutionId } : {}),
      decision: { verdict: input.verdict, reason: input.reason },
    }
  );

export const compactStage = (input: {
  upstreamOutput: string;
  stage: "discover" | "define" | "develop" | "scope" | "deliver";
}) =>
  post<{ success: true; compactedContext: string }>("/api/agents/compact", input);

// ─── Develop ──────────────────────────────────────────────────────

export const startSolutionGeneration = (input: {
  problemId: string;
  researchId: string;
}) =>
  post<{ solutionCollectionId: string; runId: string }>(
    "/api/solutions/generate/start",
    input
  );

export const startSolutionResearch = (input: {
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
  direction: string;
}) =>
  post<{ solutionId: string; runId: string }>(
    "/api/solutions/research/start",
    input
  );

// ─── Scope ────────────────────────────────────────────────────────

export const startScope = (input: {
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
}) =>
  post<{ mvpId: string; runId: string }>("/api/scope/start", input);

export const startMetrics = (input: {
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
}) =>
  post<{ metricsId: string; runId: string }>("/api/metrics/start", input);

// MVP and SuccessMetrics confirmation are direct Firestore writes (owner-scoped
// + sanitized at write time). Surfaced through the store so the UI doesn't
// touch Firestore directly.
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PATHS } from "@/lib/firebase/collections";

export async function confirmMvp(input: {
  uid: string;
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
  mvpId: string;
  founderEdits?: string;
}) {
  await updateDoc(
    doc(
      db,
      PATHS.mvp(
        input.uid,
        input.problemId,
        input.researchId,
        input.solutionCollectionId,
        input.solutionId,
        input.mvpId
      )
    ),
    {
      founderConfirmed: true,
      ...(input.founderEdits ? { founderEdits: input.founderEdits } : {}),
      confirmedAt: serverTimestamp(),
    }
  );
}

export async function confirmMetrics(input: {
  uid: string;
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
  metricsId: string;
  founderEdits?: { adoption?: string; value?: string; business?: string };
}) {
  await updateDoc(
    doc(
      db,
      PATHS.successMetric(
        input.uid,
        input.problemId,
        input.researchId,
        input.solutionCollectionId,
        input.solutionId,
        input.metricsId
      )
    ),
    {
      founderConfirmed: true,
      ...(input.founderEdits ? { founderEdits: input.founderEdits } : {}),
      confirmedAt: serverTimestamp(),
    }
  );
}

// ─── Deliver ──────────────────────────────────────────────────────

export const startPrdWrite = (input: {
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
  mvpId: string;
  metricsId: string;
}) =>
  post<{ prdId: string; runId: string }>("/api/prd/start", input);

export const startPhaseWrite = (input: {
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
  prdId: string;
  version: string;
}) =>
  post<{ phaseId: string; version: string; order: number; runId: string }>(
    "/api/phase/start",
    input
  );

// Made with Bob
