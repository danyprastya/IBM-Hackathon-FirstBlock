// Pipeline store. Single source of truth for all pipeline state on the client.
//
// State is normalized by parent path (problemsByUid, researchesByProblem, etc.).
// Components never read Firestore directly — they read from this store via the
// hooks in /hooks. Mutations also go through here (re-exported from ./actions).
//
// Subscriptions are reference-counted (see ./subscriptions). When the first
// component subscribes to e.g. researches for a problem, an onSnapshot listener
// mounts; when the last unmounts, the listener tears down.

"use client";

import { create } from "zustand";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PATHS } from "@/lib/firebase/collections";
import { refSubscribe } from "./subscriptions";
import type {
  PipelineState,
  Problem,
  Research,
  SolutionCollection,
  Solution,
  MVP,
  SuccessMetrics,
  PRD,
  Phase,
} from "./types";
import { keys } from "./types";

// ─── Conversion helpers ───────────────────────────────────────────

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return new Date();
}

const conv = {
  problem: (snap: QueryDocumentSnapshot<DocumentData>): Problem => {
    const d = snap.data();
    return {
      id: snap.id,
      rawInput: d.rawInput ?? "",
      htmlContent: d.htmlContent ?? "",
      // Migration-safe: prefer new `title`, fall back to legacy `cleanedStatement`.
      title: d.title ?? d.cleanedStatement ?? "",
      inputType: d.inputType ?? "text",
      createdAt: toDate(d.createdAt),
      folder: d.folder ?? "Drafts",
      pinned: d.pinned ?? false,
    };
  },
  research: (snap: QueryDocumentSnapshot<DocumentData>): Research => {
    const d = snap.data();
    return {
      id: snap.id,
      createdAt: toDate(d.createdAt),
      status: d.status ?? "running",
      brief: d.brief ?? {
        marketSignal: "",
        painEvidence: "",
        competition: "white_space",
        competitionNote: "",
        aiVerdict: "watch",
        aiReason: "",
      },
      founderDecision: d.founderDecision
        ? { ...d.founderDecision, decidedAt: toDate(d.founderDecision.decidedAt) }
        : null,
      compactedContext: d.compactedContext ?? "",
    };
  },
  solutionCollection: (snap: QueryDocumentSnapshot<DocumentData>): SolutionCollection => {
    const d = snap.data();
    return {
      id: snap.id,
      createdAt: toDate(d.createdAt),
      status: d.status ?? "running",
      solutionCount: d.solutionCount ?? 0,
      compactedContext: d.compactedContext ?? "",
    };
  },
  solution: (snap: QueryDocumentSnapshot<DocumentData>): Solution => {
    const d = snap.data();
    return {
      id: snap.id,
      direction: d.direction ?? "",
      createdAt: toDate(d.createdAt),
      status: d.status ?? "pending",
      brief: d.brief ?? {
        feasibility: "",
        differentiation: "",
        founderEdge: "",
        aiVerdict: "watch",
        aiReason: "",
      },
      founderDecision: d.founderDecision
        ? { ...d.founderDecision, decidedAt: toDate(d.founderDecision.decidedAt) }
        : null,
    };
  },
  mvp: (snap: QueryDocumentSnapshot<DocumentData>): MVP => {
    const d = snap.data();
    return {
      id: snap.id,
      createdAt: toDate(d.createdAt),
      status: d.status ?? "running",
      scopeIn: d.scopeIn ?? [],
      scopeOut: d.scopeOut ?? [],
      founderConfirmed: d.founderConfirmed ?? false,
      founderEdits: d.founderEdits,
      confirmedAt: d.confirmedAt ? toDate(d.confirmedAt) : null,
    };
  },
  successMetrics: (snap: QueryDocumentSnapshot<DocumentData>): SuccessMetrics => {
    const d = snap.data();
    return {
      id: snap.id,
      createdAt: toDate(d.createdAt),
      status: d.status ?? "running",
      metrics: d.metrics ?? { adoption: "", value: "", business: "" },
      founderConfirmed: d.founderConfirmed ?? false,
      founderEdits: d.founderEdits,
      confirmedAt: d.confirmedAt ? toDate(d.confirmedAt) : null,
    };
  },
  prd: (snap: QueryDocumentSnapshot<DocumentData>): PRD => {
    const d = snap.data();
    return {
      id: snap.id,
      createdAt: toDate(d.createdAt),
      status: d.status ?? "running",
      fullPrd: d.fullPrd ?? "",
      mvpRef: d.mvpRef ?? "",
      metricsRef: d.metricsRef ?? "",
    };
  },
  phase: (snap: QueryDocumentSnapshot<DocumentData>): Phase => {
    const d = snap.data();
    return {
      id: snap.id,
      version: d.version ?? "",
      order: d.order ?? 0,
      content: d.content ?? "",
      createdAt: toDate(d.createdAt),
      status: d.status ?? "running",
    };
  },
};

// ─── Store ────────────────────────────────────────────────────────

export const usePipelineStore = create<PipelineState>(() => ({
  problemsByUid: {},
  researchesByProblem: {},
  solutionCollectionsByResearch: {},
  solutionsByCollection: {},
  mvpsBySolution: {},
  successMetricsBySolution: {},
  prdsBySolution: {},
  phasesByPrd: {},
  loading: {},
  errors: {},
}));

const set = usePipelineStore.setState;

function setSlice<K extends keyof PipelineState>(
  slice: K,
  key: string,
  value: PipelineState[K] extends Record<string, infer V> ? V : never
): void {
  set((state) => ({
    [slice]: { ...(state[slice] as Record<string, unknown>), [key]: value },
  }) as Partial<PipelineState>);
}

function setLoading(key: string, loading: boolean): void {
  set((state) => ({ loading: { ...state.loading, [key]: loading } }));
}

function setError(key: string, error: string | null): void {
  set((state) => ({ errors: { ...state.errors, [key]: error } }));
}

// ─── Subscription factories ───────────────────────────────────────
// Each returns an unsubscribe fn. Ref-counted via refSubscribe so concurrent
// callers share one onSnapshot.

export const subscriptions = {
  problems(uid: string) {
    const key = `problems:${uid}`;
    setLoading(key, true);
    return refSubscribe(key, () =>
      onSnapshot(
        query(
          collection(db, PATHS.problems(uid)),
          orderBy("createdAt", "desc")
        ),
        (snap) => {
          setSlice("problemsByUid", uid, snap.docs.map(conv.problem));
          setLoading(key, false);
          setError(key, null);
        },
        (err) => {
          console.error("[store] problems listener:", err);
          setError(key, err.message);
          setLoading(key, false);
        }
      )
    );
  },

  researches(uid: string, problemId: string) {
    const key = `researches:${uid}:${problemId}`;
    const sliceKey = keys.research(problemId);
    setLoading(key, true);
    return refSubscribe(key, () =>
      onSnapshot(
        query(
          collection(db, PATHS.researches(uid, problemId)),
          orderBy("createdAt", "asc")
        ),
        (snap) => {
          setSlice("researchesByProblem", sliceKey, snap.docs.map(conv.research));
          setLoading(key, false);
          setError(key, null);
        },
        (err) => {
          console.error("[store] researches listener:", err);
          setError(key, err.message);
          setLoading(key, false);
        }
      )
    );
  },

  solutionCollections(uid: string, problemId: string, researchId: string) {
    const key = `solutionCollections:${uid}:${problemId}:${researchId}`;
    const sliceKey = keys.solutionCollection(problemId, researchId);
    setLoading(key, true);
    return refSubscribe(key, () =>
      onSnapshot(
        query(
          collection(db, PATHS.solutionCollections(uid, problemId, researchId)),
          orderBy("createdAt", "asc")
        ),
        (snap) => {
          setSlice(
            "solutionCollectionsByResearch",
            sliceKey,
            snap.docs.map(conv.solutionCollection)
          );
          setLoading(key, false);
          setError(key, null);
        },
        (err) => {
          console.error("[store] solutionCollections listener:", err);
          setError(key, err.message);
          setLoading(key, false);
        }
      )
    );
  },

  solutions(
    uid: string, problemId: string, researchId: string, scId: string
  ) {
    const key = `solutions:${uid}:${problemId}:${researchId}:${scId}`;
    const sliceKey = keys.solution(problemId, researchId, scId);
    setLoading(key, true);
    return refSubscribe(key, () =>
      onSnapshot(
        query(
          collection(db, PATHS.solutions(uid, problemId, researchId, scId)),
          orderBy("createdAt", "asc")
        ),
        (snap) => {
          setSlice("solutionsByCollection", sliceKey, snap.docs.map(conv.solution));
          setLoading(key, false);
          setError(key, null);
        },
        (err) => {
          console.error("[store] solutions listener:", err);
          setError(key, err.message);
          setLoading(key, false);
        }
      )
    );
  },

  mvps(
    uid: string, problemId: string, researchId: string, scId: string, solId: string
  ) {
    const key = `mvps:${uid}:${problemId}:${researchId}:${scId}:${solId}`;
    const sliceKey = keys.mvp(problemId, researchId, scId, solId);
    setLoading(key, true);
    return refSubscribe(key, () =>
      onSnapshot(
        query(
          collection(db, PATHS.mvps(uid, problemId, researchId, scId, solId)),
          orderBy("createdAt", "asc")
        ),
        (snap) => {
          setSlice("mvpsBySolution", sliceKey, snap.docs.map(conv.mvp));
          setLoading(key, false);
          setError(key, null);
        },
        (err) => {
          console.error("[store] mvps listener:", err);
          setError(key, err.message);
          setLoading(key, false);
        }
      )
    );
  },

  successMetrics(
    uid: string, problemId: string, researchId: string, scId: string, solId: string
  ) {
    const key = `successMetrics:${uid}:${problemId}:${researchId}:${scId}:${solId}`;
    const sliceKey = keys.successMetrics(problemId, researchId, scId, solId);
    setLoading(key, true);
    return refSubscribe(key, () =>
      onSnapshot(
        query(
          collection(db, PATHS.successMetrics(uid, problemId, researchId, scId, solId)),
          orderBy("createdAt", "asc")
        ),
        (snap) => {
          setSlice(
            "successMetricsBySolution",
            sliceKey,
            snap.docs.map(conv.successMetrics)
          );
          setLoading(key, false);
          setError(key, null);
        },
        (err) => {
          console.error("[store] successMetrics listener:", err);
          setError(key, err.message);
          setLoading(key, false);
        }
      )
    );
  },

  prds(
    uid: string, problemId: string, researchId: string, scId: string, solId: string
  ) {
    const key = `prds:${uid}:${problemId}:${researchId}:${scId}:${solId}`;
    const sliceKey = keys.prd(problemId, researchId, scId, solId);
    setLoading(key, true);
    return refSubscribe(key, () =>
      onSnapshot(
        query(
          collection(db, PATHS.prds(uid, problemId, researchId, scId, solId)),
          orderBy("createdAt", "asc")
        ),
        (snap) => {
          setSlice("prdsBySolution", sliceKey, snap.docs.map(conv.prd));
          setLoading(key, false);
          setError(key, null);
        },
        (err) => {
          console.error("[store] prds listener:", err);
          setError(key, err.message);
          setLoading(key, false);
        }
      )
    );
  },

  phases(
    uid: string,
    problemId: string,
    researchId: string,
    scId: string,
    solId: string,
    prdId: string
  ) {
    const key = `phases:${uid}:${problemId}:${researchId}:${scId}:${solId}:${prdId}`;
    const sliceKey = keys.phase(problemId, researchId, scId, solId, prdId);
    setLoading(key, true);
    return refSubscribe(key, () =>
      onSnapshot(
        query(
          collection(db, PATHS.phases(uid, problemId, researchId, scId, solId, prdId)),
          orderBy("order", "asc")
        ),
        (snap) => {
          setSlice("phasesByPrd", sliceKey, snap.docs.map(conv.phase));
          setLoading(key, false);
          setError(key, null);
        },
        (err) => {
          console.error("[store] phases listener:", err);
          setError(key, err.message);
          setLoading(key, false);
        }
      )
    );
  },

  /** Single-doc listener for one specific problem (the idea page uses this). */
  problem(uid: string, problemId: string) {
    const key = `problem:${uid}:${problemId}`;
    setLoading(key, true);
    return refSubscribe(key, () =>
      onSnapshot(
        doc(db, PATHS.problem(uid, problemId)),
        (snap) => {
          if (!snap.exists()) {
            setSlice("problemsByUid", `${uid}/${problemId}`, []);
            setLoading(key, false);
            return;
          }
          // Update the single problem in the list-by-uid record if present;
          // otherwise stash under a per-doc key for direct lookup.
          set((state) => {
            const list = state.problemsByUid[uid] ?? [];
            const updated = conv.problem(snap as QueryDocumentSnapshot<DocumentData>);
            const nextList = list.some((p) => p.id === updated.id)
              ? list.map((p) => (p.id === updated.id ? updated : p))
              : [updated, ...list];
            return {
              problemsByUid: { ...state.problemsByUid, [uid]: nextList },
            };
          });
          setLoading(key, false);
          setError(key, null);
        },
        (err) => {
          console.error("[store] problem listener:", err);
          setError(key, err.message);
          setLoading(key, false);
        }
      )
    );
  },
};

// ─── Re-exports ───────────────────────────────────────────────────

export * as actions from "./actions";
export * as selectors from "./selectors";
export type {
  Problem,
  Research,
  SolutionCollection,
  Solution,
  MVP,
  SuccessMetrics,
  PRD,
  Phase,
  Verdict,
  CompetitionLevel,
  AgentStatus,
  FounderDecision,
} from "./types";

// Made with Bob
