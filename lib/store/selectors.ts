// Pure selectors over the pipeline store. Components read state via these.
//
// Pattern: parameterized selectors are factories that return a (state) =>
// fn so they can be passed to useStore directly:
//
//   const sel = useMemo(() => selectActiveResearch(problemId), [problemId]);
//   const research = usePipelineStore(sel);
//
// IMPORTANT: All fallback values use module-level constants so that
// `getServerSnapshot` always returns the same reference. Returning a
// fresh `[]` or `{}` on every call causes React 19's useSyncExternalStore
// to detect an uncached snapshot and trigger an infinite loop.

import { keys } from "./types";
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

// ─── Stable empty defaults (same reference every call) ────────────
const EMPTY_PROBLEMS: Problem[] = [];
const EMPTY_RESEARCHES: Research[] = [];
const EMPTY_SOLUTION_COLLECTIONS: SolutionCollection[] = [];
const EMPTY_SOLUTIONS: Solution[] = [];
const EMPTY_MVPS: MVP[] = [];
const EMPTY_SUCCESS_METRICS: SuccessMetrics[] = [];
const EMPTY_PRDS: PRD[] = [];
const EMPTY_PHASES: Phase[] = [];
const EMPTY_FOLDERS: Record<string, Problem[]> = {};

// ─── Problems ─────────────────────────────────────────────────────

export const selectProblems =
  (uid: string | null) =>
  (state: PipelineState): Problem[] =>
    uid ? state.problemsByUid[uid] ?? EMPTY_PROBLEMS : EMPTY_PROBLEMS;

export const selectProblem =
  (uid: string | null, problemId: string) =>
  (state: PipelineState): Problem | null => {
    if (!uid) return null;
    const list = state.problemsByUid[uid];
    return list?.find((p) => p.id === problemId) ?? null;
  };

/** Group problems by folder label, default "Drafts". */
export const selectFolders =
  (uid: string | null) =>
  (state: PipelineState): Record<string, Problem[]> => {
    if (!uid) return EMPTY_FOLDERS;
    const list = state.problemsByUid[uid];
    if (!list || list.length === 0) return EMPTY_FOLDERS;
    return list.reduce<Record<string, Problem[]>>((acc, p) => {
      const f = p.folder ?? "Drafts";
      (acc[f] ??= []).push(p);
      return acc;
    }, {});
  };

// ─── Researches ───────────────────────────────────────────────────

export const selectResearches =
  (problemId: string) =>
  (state: PipelineState): Research[] =>
    state.researchesByProblem[keys.research(problemId)] ?? EMPTY_RESEARCHES;

/** The latest research for a problem (by createdAt asc → last item). */
export const selectActiveResearch =
  (problemId: string) =>
  (state: PipelineState): Research | null => {
    const list = state.researchesByProblem[keys.research(problemId)];
    if (!list || list.length === 0) return null;
    return list[list.length - 1] ?? null;
  };

// ─── Solution collections + solutions ─────────────────────────────

export const selectSolutionCollections =
  (problemId: string, researchId: string) =>
  (state: PipelineState): SolutionCollection[] =>
    state.solutionCollectionsByResearch[
      keys.solutionCollection(problemId, researchId)
    ] ?? EMPTY_SOLUTION_COLLECTIONS;

export const selectActiveSolutionCollection =
  (problemId: string, researchId: string) =>
  (state: PipelineState): SolutionCollection | null => {
    const list = selectSolutionCollections(problemId, researchId)(state);
    if (list.length === 0) return null;
    return list[list.length - 1] ?? null;
  };

export const selectSolutions =
  (problemId: string, researchId: string, scId: string) =>
  (state: PipelineState): Solution[] =>
    state.solutionsByCollection[keys.solution(problemId, researchId, scId)] ?? EMPTY_SOLUTIONS;

// ─── MVP / Metrics / PRD / Phases (latest by createdAt asc) ───────

const latest = <T extends { createdAt: Date }>(arr: T[] | undefined): T | null =>
  arr && arr.length > 0 ? arr[arr.length - 1] : null;

export const selectMvps =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): MVP[] =>
    state.mvpsBySolution[keys.mvp(problemId, researchId, scId, solId)] ?? EMPTY_MVPS;

export const selectActiveMvp =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): MVP | null =>
    latest(selectMvps(problemId, researchId, scId, solId)(state));

export const selectSuccessMetricsList =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): SuccessMetrics[] =>
    state.successMetricsBySolution[
      keys.successMetrics(problemId, researchId, scId, solId)
    ] ?? EMPTY_SUCCESS_METRICS;

export const selectActiveSuccessMetrics =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): SuccessMetrics | null =>
    latest(selectSuccessMetricsList(problemId, researchId, scId, solId)(state));

export const selectPrds =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): PRD[] =>
    state.prdsBySolution[keys.prd(problemId, researchId, scId, solId)] ?? EMPTY_PRDS;

export const selectActivePrd =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): PRD | null =>
    latest(selectPrds(problemId, researchId, scId, solId)(state));

export const selectPhases =
  (problemId: string, researchId: string, scId: string, solId: string, prdId: string) =>
  (state: PipelineState): Phase[] =>
    state.phasesByPrd[keys.phase(problemId, researchId, scId, solId, prdId)] ?? EMPTY_PHASES;

// ─── Loading / errors ─────────────────────────────────────────────

export const selectLoading =
  (key: string) =>
  (state: PipelineState): boolean =>
    state.loading[key] ?? false;

export const selectError =
  (key: string) =>
  (state: PipelineState): string | null =>
    state.errors[key] ?? null;

// ─── Gates (pure derivations) ─────────────────────────────────────

export const canEnterSolutions = (research: Research | null): boolean =>
  research?.founderDecision?.verdict === "pursue";

export const canEnterScopeMetrics = (solution: Solution | null): boolean =>
  solution?.founderDecision?.verdict === "pursue";

export const canEnterPrd = (
  mvp: MVP | null,
  metrics: SuccessMetrics | null
): boolean =>
  Boolean(mvp?.founderConfirmed && metrics?.founderConfirmed);

export const canEnterPhases = (prd: PRD | null): boolean =>
  prd?.status === "complete";

// Made with Bob
