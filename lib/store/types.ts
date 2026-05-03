// UI-friendly shapes the store holds. Mirror Firestore docs but with Date
// instead of Timestamp so components don't have to convert.
//
// Source-of-truth document interfaces live in lib/firebase/collections.ts;
// these are the rehydrated shapes after onSnapshot conversion.

import type {
  Verdict,
  CompetitionLevel,
  AgentStatus,
  FounderDecision,
} from "@/lib/firebase/collections";

export type {
  Verdict,
  CompetitionLevel,
  AgentStatus,
  FounderDecision,
};

export interface Problem {
  id: string;
  rawInput: string;
  /** Rich HTML version of the idea from the editor */
  htmlContent?: string;
  /** AI-generated short title; "" until title-generation task completes. */
  title: string;
  inputType: "text" | "voice";
  createdAt: Date;
  /** Folder label — defaults to "Drafts". */
  folder?: string;
  /** Whether this idea is pinned to the top. */
  pinned?: boolean;
}

export interface Research {
  id: string;
  createdAt: Date;
  status: AgentStatus;
  brief: {
    marketSignal: string;
    painEvidence: string;
    competition: CompetitionLevel;
    competitionNote: string;
    aiVerdict: Verdict;
    aiReason: string;
  };
  founderDecision: FounderDecision | null;
  compactedContext: string;
}

export interface SolutionCollection {
  id: string;
  createdAt: Date;
  status: AgentStatus;
  solutionCount: number;
  compactedContext: string;
}

export interface Solution {
  id: string;
  direction: string;
  createdAt: Date;
  status: AgentStatus | "pending";
  brief: {
    feasibility: string;
    differentiation: string;
    founderEdge: string;
    aiVerdict: Verdict;
    aiReason: string;
  };
  founderDecision: FounderDecision | null;
}

export interface MVP {
  id: string;
  createdAt: Date;
  status: AgentStatus;
  scopeIn: string[];
  scopeOut: string[];
  founderConfirmed: boolean;
  founderEdits?: string;
  confirmedAt: Date | null;
}

export interface SuccessMetrics {
  id: string;
  createdAt: Date;
  status: AgentStatus;
  metrics: { adoption: string; value: string; business: string };
  founderConfirmed: boolean;
  founderEdits?: { adoption?: string; value?: string; business?: string };
  confirmedAt: Date | null;
}

export interface PRD {
  id: string;
  createdAt: Date;
  status: AgentStatus;
  fullPrd: string;
  mvpRef: string;
  metricsRef: string;
}

export interface Phase {
  id: string;
  version: string;
  order: number;
  content: string;
  createdAt: Date;
  status: AgentStatus;
}

// ─── Store state shape ────────────────────────────────────────────
// Defined here so selectors and the store both import from one place.

export interface PipelineState {
  problemsByUid: Record<string, Problem[]>;
  researchesByProblem: Record<string, Research[]>;
  solutionCollectionsByResearch: Record<string, SolutionCollection[]>;
  solutionsByCollection: Record<string, Solution[]>;
  mvpsBySolution: Record<string, MVP[]>;
  successMetricsBySolution: Record<string, SuccessMetrics[]>;
  prdsBySolution: Record<string, PRD[]>;
  phasesByPrd: Record<string, Phase[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

// ─── Composite key helpers ─────────────────────────────────────────
// The store keys collections by their parent path. These helpers ensure
// every reader uses the same key shape.

export const keys = {
  research: (problemId: string) => problemId,
  solutionCollection: (problemId: string, researchId: string) =>
    `${problemId}/${researchId}`,
  solution: (problemId: string, researchId: string, scId: string) =>
    `${problemId}/${researchId}/${scId}`,
  mvp: (problemId: string, researchId: string, scId: string, solId: string) =>
    `${problemId}/${researchId}/${scId}/${solId}`,
  successMetrics: (problemId: string, researchId: string, scId: string, solId: string) =>
    `${problemId}/${researchId}/${scId}/${solId}`,
  prd: (problemId: string, researchId: string, scId: string, solId: string) =>
    `${problemId}/${researchId}/${scId}/${solId}`,
  phase: (
    problemId: string, researchId: string, scId: string, solId: string, prdId: string
  ) => `${problemId}/${researchId}/${scId}/${solId}/${prdId}`,
};

// Made with Bob
