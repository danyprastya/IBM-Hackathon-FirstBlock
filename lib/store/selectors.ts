// Pure selectors over the pipeline store. Components read state via these.
//
// Pattern: parameterized selectors are factories that return a (state) =>
// fn so they can be passed to useStore directly:
//
//   const research = usePipelineStore(selectActiveResearch(problemId));
//
// Stability: every list selector returns either the actual stored array
// (whose reference is stable until a snapshot replaces it) or the same
// frozen empty array. Never `?? []` — that creates a new array per read
// and breaks React's useSyncExternalStore snapshot equality, infinite-
// looping the consumer.

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

const EMPTY_ARRAY: readonly unknown[] = Object.freeze([]);
const empty = <T>(): T[] => EMPTY_ARRAY as unknown as T[];

// ─── Problems ─────────────────────────────────────────────────────

export const selectProblems =
  (uid: string | null) =>
  (state: PipelineState): Problem[] =>
    (uid && state.problemsByUid[uid]) || empty<Problem>();

export const selectProblem =
  (uid: string | null, problemId: string) =>
  (state: PipelineState): Problem | null => {
    if (!uid) return null;
    const list = state.problemsByUid[uid];
    return list?.find((p) => p.id === problemId) ?? null;
  };

// NOTE: selectFolders intentionally removed. Folder grouping derives a new
// object on every call — that's fine inside a useMemo in the consuming hook
// (see useProblems), but it cannot live as a store selector or it triggers
// the same snapshot-equality infinite loop fixed above.

// ─── Researches ───────────────────────────────────────────────────

export const selectResearches =
  (problemId: string) =>
  (state: PipelineState): Research[] =>
    state.researchesByProblem[keys.research(problemId)] || empty<Research>();

/** The latest research for a problem (by createdAt asc → last item). */
export const selectActiveResearch =
  (problemId: string) =>
  (state: PipelineState): Research | null => {
    const list = state.researchesByProblem[keys.research(problemId)];
    return list && list.length > 0 ? list[list.length - 1] : null;
  };

// ─── Solution collections + solutions ─────────────────────────────

export const selectSolutionCollections =
  (problemId: string, researchId: string) =>
  (state: PipelineState): SolutionCollection[] =>
    state.solutionCollectionsByResearch[
      keys.solutionCollection(problemId, researchId)
    ] || empty<SolutionCollection>();

export const selectActiveSolutionCollection =
  (problemId: string, researchId: string) =>
  (state: PipelineState): SolutionCollection | null => {
    const list =
      state.solutionCollectionsByResearch[
        keys.solutionCollection(problemId, researchId)
      ];
    return list && list.length > 0 ? list[list.length - 1] : null;
  };

export const selectSolutions =
  (problemId: string, researchId: string, scId: string) =>
  (state: PipelineState): Solution[] =>
    state.solutionsByCollection[keys.solution(problemId, researchId, scId)] ||
    empty<Solution>();

// ─── MVP / Metrics / PRD / Phases (latest by createdAt asc) ───────

const lastOrNull = <T>(arr: T[] | undefined): T | null =>
  arr && arr.length > 0 ? arr[arr.length - 1] : null;

export const selectMvps =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): MVP[] =>
    state.mvpsBySolution[keys.mvp(problemId, researchId, scId, solId)] ||
    empty<MVP>();

export const selectActiveMvp =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): MVP | null =>
    lastOrNull(state.mvpsBySolution[keys.mvp(problemId, researchId, scId, solId)]);

export const selectSuccessMetricsList =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): SuccessMetrics[] =>
    state.successMetricsBySolution[
      keys.successMetrics(problemId, researchId, scId, solId)
    ] || empty<SuccessMetrics>();

export const selectActiveSuccessMetrics =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): SuccessMetrics | null =>
    lastOrNull(
      state.successMetricsBySolution[
        keys.successMetrics(problemId, researchId, scId, solId)
      ]
    );

export const selectPrds =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): PRD[] =>
    state.prdsBySolution[keys.prd(problemId, researchId, scId, solId)] ||
    empty<PRD>();

export const selectActivePrd =
  (problemId: string, researchId: string, scId: string, solId: string) =>
  (state: PipelineState): PRD | null =>
    lastOrNull(state.prdsBySolution[keys.prd(problemId, researchId, scId, solId)]);

export const selectPhases =
  (problemId: string, researchId: string, scId: string, solId: string, prdId: string) =>
  (state: PipelineState): Phase[] =>
    state.phasesByPrd[keys.phase(problemId, researchId, scId, solId, prdId)] ||
    empty<Phase>();

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
