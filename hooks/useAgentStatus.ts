"use client";

import { useMemo } from "react";
import { useResearches } from "./useResearches";
import { useSolutionCollections } from "./useSolutionCollections";
import { useSolutions } from "./useSolutions";
import type { AgentStatus } from "@/lib/store";

export type Stage = "discover" | "define" | "develop" | "scope" | "deliver";

export interface AgentRun {
  id: string;
  name: string;
  status: AgentStatus | "idle";
  timestamp?: Date;
  /** For gates — has founder made a decision? */
  decided?: boolean;
}

export interface StageData {
  key: Stage;
  label: string;
  icon: string;
  agents: AgentRun[];
  gateStatus: "locked" | "waiting" | "passed";
}

const STAGE_DEFAULTS: StageData[] = [
  { key: "discover", label: "Discover", icon: "🔍", agents: [], gateStatus: "locked" },
  { key: "define", label: "Define", icon: "📋", agents: [], gateStatus: "locked" },
  { key: "develop", label: "Develop", icon: "⚡", agents: [], gateStatus: "locked" },
  { key: "scope", label: "Scope", icon: "🎯", agents: [], gateStatus: "locked" },
  { key: "deliver", label: "Deliver", icon: "📦", agents: [], gateStatus: "locked" },
];

/**
 * Composed view of pipeline state for the AgentPanel sidebar.
 *
 * Reads the underlying state from the Zustand store via the per-stage hooks
 * (useResearches, useSolutionCollections, useSolutions). Subscriptions are
 * mounted by those hooks; this hook just shapes the data for the panel.
 *
 * Currently covers Discover, Define, Develop. Scope and Deliver are
 * scaffolded as locked until UI for those stages is built and we add
 * useMvps / useSuccessMetrics / usePrds / usePhases lookups here.
 */
export function useAgentStatus(problemId: string | null) {
  const { researches, loading: rLoading } = useResearches(problemId);

  // Latest research drives the next layer.
  const latestResearch = researches[researches.length - 1] ?? null;
  const { collections, loading: scLoading } = useSolutionCollections(
    problemId,
    latestResearch?.id ?? null
  );

  const latestSc = collections[collections.length - 1] ?? null;
  const { solutions, loading: solLoading } = useSolutions(
    problemId,
    latestResearch?.id ?? null,
    latestSc?.id ?? null
  );

  const stages = useMemo<StageData[]>(() => {
    const next: StageData[] = STAGE_DEFAULTS.map((s) => ({ ...s, agents: [] }));

    // ── Discover: problem exists -> complete + gate passed
    if (problemId) {
      next[0].agents = [
        {
          id: "problem-dump",
          name: "Problem dump received",
          status: "complete",
        },
      ];
      next[0].gateStatus = "passed";
    }

    // ── Define: ProblemResearch agents (one per research version, newest first)
    next[1].agents = [...researches]
      .reverse()
      .map((r, i) => ({
        id: r.id,
        name: `ProblemResearchAgent #${researches.length - i}`,
        status: r.status,
        timestamp: r.createdAt,
        decided: r.founderDecision !== null,
      }));
    {
      const allComplete =
        next[1].agents.length > 0 &&
        next[1].agents.every((a) => a.status === "complete");
      const anyDecided = next[1].agents.some((a) => a.decided);
      next[1].gateStatus = anyDecided
        ? "passed"
        : allComplete
        ? "waiting"
        : "locked";
    }

    // ── Develop: SolutionGenerator + per-direction SolutionResearch
    if (latestSc) {
      const developAgents: AgentRun[] = [];
      developAgents.push({
        id: "sol-gen",
        name: "SolutionGeneratorAgent",
        status: latestSc.status,
        timestamp: latestSc.createdAt,
      });

      const solAgents: AgentRun[] = [...solutions]
        .reverse()
        .map((s, i) => ({
          id: s.id,
          name: `SolutionResearchAgent #${solutions.length - i}`,
          status: s.status === "pending" ? "idle" : s.status,
          timestamp: s.createdAt,
          decided: s.founderDecision !== null,
        }));

      next[2].agents = [...developAgents, ...solAgents];
      const allDone =
        next[2].agents.length > 0 &&
        next[2].agents.every((a) => a.status === "complete");
      const anyDecided = solAgents.some((a) => a.decided);
      next[2].gateStatus = anyDecided
        ? "passed"
        : allDone
        ? "waiting"
        : "locked";
    }

    return next;
  }, [problemId, researches, latestSc, solutions]);

  return {
    stages,
    loading: rLoading || scLoading || solLoading,
  };
}

// Made with Bob
