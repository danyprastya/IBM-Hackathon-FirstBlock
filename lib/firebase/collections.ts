// Firestore collection names, TypeScript interfaces, and subcollection path helpers
// Uses nested subcollection model: users/{uid}/problems/{pid}/researches/...

// ─── Top-level collection names ────────────────────────────────────
export const COLLECTIONS = {
  USERS: "users",
  MESSAGES: "messages",
  STICKIES: "stickies",
} as const;

// ─── Subcollection names (nested under users) ─────────────────────
export const SUBCOLLECTIONS = {
  PROBLEMS: "problems",
  RESEARCHES: "researches",
  SOLUTION_COLLECTIONS: "solutionCollections",
  SOLUTIONS: "solutions",
  MVPS: "mvps",
  SUCCESS_METRICS: "successMetrics",
  PRDS: "prds",
  PHASES: "phases",
} as const;

// ─── Path helpers for nested subcollections ────────────────────────
// Build Firestore paths without hardcoding strings everywhere

export const PATHS = {
  /** users/{userId} */
  user: (userId: string) => `users/${userId}`,

  /** users/{userId}/problems/{problemId} */
  problem: (userId: string, problemId: string) =>
    `users/${userId}/problems/${problemId}`,

  /** users/{userId}/problems */
  problems: (userId: string) =>
    `users/${userId}/problems`,

  /** .../problems/{problemId}/researches/{researchId} */
  research: (userId: string, problemId: string, researchId: string) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}`,

  /** .../problems/{problemId}/researches */
  researches: (userId: string, problemId: string) =>
    `users/${userId}/problems/${problemId}/researches`,

  /** .../researches/{researchId}/solutionCollections/{scId} */
  solutionCollection: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}`,

  /** .../researches/{researchId}/solutionCollections */
  solutionCollections: (
    userId: string,
    problemId: string,
    researchId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections`,

  /** .../solutionCollections/{scId}/solutions/{solId} */
  solution: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string,
    solId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}/solutions/${solId}`,

  /** .../solutionCollections/{scId}/solutions */
  solutions: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}/solutions`,

  /** .../solutions/{solId}/mvps/{mvpId} */
  mvp: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string,
    solId: string,
    mvpId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}/solutions/${solId}/mvps/${mvpId}`,

  /** .../solutions/{solId}/mvps */
  mvps: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string,
    solId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}/solutions/${solId}/mvps`,

  /** .../solutions/{solId}/successMetrics/{smId} */
  successMetric: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string,
    solId: string,
    smId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}/solutions/${solId}/successMetrics/${smId}`,

  /** .../solutions/{solId}/successMetrics */
  successMetrics: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string,
    solId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}/solutions/${solId}/successMetrics`,

  /** .../solutions/{solId}/prds/{prdId} */
  prd: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string,
    solId: string,
    prdId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}/solutions/${solId}/prds/${prdId}`,

  /** .../solutions/{solId}/prds */
  prds: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string,
    solId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}/solutions/${solId}/prds`,

  /** .../prds/{prdId}/phases/{phaseId} */
  phase: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string,
    solId: string,
    prdId: string,
    phaseId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}/solutions/${solId}/prds/${prdId}/phases/${phaseId}`,

  /** .../prds/{prdId}/phases */
  phases: (
    userId: string,
    problemId: string,
    researchId: string,
    scId: string,
    solId: string,
    prdId: string
  ) =>
    `users/${userId}/problems/${problemId}/researches/${researchId}/solutionCollections/${scId}/solutions/${solId}/prds/${prdId}/phases`,
} as const;

// ─── Existing document interfaces (unchanged) ─────────────────────

export interface UserDocument {
  uid: string;
  email: string;
  name?: string;
  onboardingCompleted: boolean;
  onboarding?: OnboardingData;
  project?: {
    businessName?: string;
    status: string;
    createdAt: Date;
  };
  rateLimit: {
    count: number;
    windowStart: Date;
  };
  createdAt: Date;
}

export interface OnboardingData {
  location?: string;
  experience?: "never" | "tried" | "running";
  capital?: "<500" | "500-2000" | "2000-10000" | "10000+";
  skills?: string[];
  interests?: string[];
  hoursPerWeek?: "<10" | "10-20" | "20-40" | "fulltime";
  concern?: string;
  goal?: string;
}

export interface MessageDocument {
  userId: string;
  role: "user" | "assistant";
  content: string;
  checklistItems?: string[];
  timestamp: Date;
}

export interface StickyDocument {
  userId: string;
  content: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Double Diamond document interfaces ───────────────────────────

/** Verdict type used across briefs and founder decisions */
export type Verdict = "pursue" | "watch" | "drop";

/** Competition level from research */
export type CompetitionLevel = "crowded" | "white_space" | "graveyard";

/** Agent execution status */
export type AgentStatus = "running" | "complete" | "failed";

/** Founder decision at a gate */
export interface FounderDecision {
  verdict: Verdict;
  reason?: string;
  decidedAt: Date;
}

/** users/{userId}/problems/{problemId} */
export interface ProblemDocument {
  id: string;
  rawInput: string;
  cleanedStatement: string;
  inputType: "text" | "voice";
  createdAt: Date;
}

/** .../problems/{pid}/researches/{rid} */
export interface ResearchDocument {
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

/** .../researches/{rid}/solutionCollections/{scid} */
export interface SolutionCollectionDocument {
  id: string;
  createdAt: Date;
  status: AgentStatus;
  solutionCount: number;
  compactedContext: string;
}

/** .../solutionCollections/{scid}/solutions/{sid} */
export interface SolutionDocument {
  id: string;
  direction: string;
  createdAt: Date;
  status: AgentStatus;
  brief: {
    feasibility: string;
    differentiation: string;
    founderEdge: string;
    aiVerdict: Verdict;
    aiReason: string;
  };
  founderDecision: FounderDecision | null;
}

/** .../solutions/{sid}/mvps/{mid} */
export interface MVPDocument {
  id: string;
  createdAt: Date;
  status: AgentStatus;
  scopeIn: string[];
  scopeOut: string[];
  founderConfirmed: boolean;
  founderEdits?: string;
  confirmedAt: Date | null;
}

/** .../solutions/{sid}/successMetrics/{smid} */
export interface SuccessMetricsDocument {
  id: string;
  createdAt: Date;
  status: AgentStatus;
  metrics: {
    adoption: string;
    value: string;
    business: string;
  };
  founderConfirmed: boolean;
  founderEdits?: {
    adoption?: string;
    value?: string;
    business?: string;
  };
  confirmedAt: Date | null;
}

/** .../solutions/{sid}/prds/{prdid} */
export interface PRDDocument {
  id: string;
  createdAt: Date;
  status: AgentStatus;
  fullPrd: string;
  mvpRef: string;
  metricsRef: string;
}

/** .../prds/{prdid}/phases/{phid} */
export interface PhaseDocument {
  id: string;
  version: "v1" | "v2" | string;
  order: number;
  content: string;
  createdAt: Date;
  status: AgentStatus;
}

// Made with Bob
