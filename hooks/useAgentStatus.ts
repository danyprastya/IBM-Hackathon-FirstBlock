"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import type {
  AgentStatus,
  ResearchDocument,
  SolutionCollectionDocument,
  SolutionDocument,
  MVPDocument,
  SuccessMetricsDocument,
  PRDDocument,
  PhaseDocument,
} from "@/lib/firebase/collections";

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

/**
 * Listens to all agent activity for a given problem.
 * Reads researches, solutionCollections, solutions, mvps, metrics, prds, phases.
 */
export function useAgentStatus(problemId: string | null) {
  const { user } = useAuth();
  const [stages, setStages] = useState<StageData[]>(getDefaultStages());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !problemId) {
      setStages(getDefaultStages());
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];
    const basePath = `users/${user.uid}/problems/${problemId}`;

    // ── Discover: problem exists → complete
    const problemUnsub = onSnapshot(doc(db, basePath), (snap) => {
      setStages((prev) => {
        const next = [...prev];
        const discover = { ...next[0] };
        if (snap.exists()) {
          discover.agents = [
            {
              id: "problem-dump",
              name: "Problem dump received",
              status: "complete" as const,
              timestamp: snap.data()?.createdAt instanceof Timestamp
                ? snap.data()?.createdAt.toDate()
                : new Date(),
            },
          ];
          discover.gateStatus = "passed";
        }
        next[0] = discover;
        return next;
      });
      setLoading(false);
    });
    unsubs.push(problemUnsub);

    // ── Define: researches subcollection
    const researchQ = query(
      collection(db, basePath, "researches"),
      orderBy("createdAt", "desc")
    );
    const researchUnsub = onSnapshot(researchQ, (snap) => {
      const agents: AgentRun[] = snap.docs.map((d, i) => {
        const data = d.data();
        return {
          id: d.id,
          name: `ProblemResearchAgent #${snap.docs.length - i}`,
          status: (data.status || "running") as AgentStatus,
          timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
          decided: data.founderDecision !== null && data.founderDecision !== undefined,
        };
      });

      const allComplete = agents.length > 0 && agents.every((a) => a.status === "complete");
      const anyDecided = agents.some((a) => a.decided);

      setStages((prev) => {
        const next = [...prev];
        next[1] = {
          ...next[1],
          agents,
          gateStatus: anyDecided ? "passed" : allComplete ? "waiting" : agents.length > 0 ? "locked" : "locked",
        };
        return next;
      });
    });
    unsubs.push(researchUnsub);

    // ── Develop: solutionCollections → solutions
    const scQ = query(
      collection(db, basePath, "researches"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const scUnsub = onSnapshot(scQ, (researchSnap) => {
      if (researchSnap.empty) return;

      const latestResearch = researchSnap.docs[0];
      const scPath = `${basePath}/researches/${latestResearch.id}/solutionCollections`;

      const scInnerUnsub = onSnapshot(
        query(collection(db, scPath), orderBy("createdAt", "desc")),
        (scSnap) => {
          const developAgents: AgentRun[] = [];

          // SolutionGenerator
          if (!scSnap.empty) {
            const sc = scSnap.docs[0].data();
            developAgents.push({
              id: "sol-gen",
              name: "SolutionGeneratorAgent",
              status: (sc.status || "running") as AgentStatus,
              timestamp: sc.createdAt instanceof Timestamp ? sc.createdAt.toDate() : undefined,
            });
          }

          // Solutions inside latest collection
          if (!scSnap.empty) {
            const latestSc = scSnap.docs[0];
            const solPath = `${scPath}/${latestSc.id}/solutions`;

            const solUnsub = onSnapshot(
              query(collection(db, solPath), orderBy("createdAt", "desc")),
              (solSnap) => {
                const solAgents: AgentRun[] = solSnap.docs.map((d, i) => {
                  const data = d.data();
                  return {
                    id: d.id,
                    name: `SolutionResearchAgent #${solSnap.docs.length - i}`,
                    status: (data.status || "running") as AgentStatus,
                    timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
                    decided: data.founderDecision !== null && data.founderDecision !== undefined,
                  };
                });

                const allAgents = [...developAgents, ...solAgents];
                const allDone = allAgents.length > 0 && allAgents.every((a) => a.status === "complete");
                const anyDecided = solAgents.some((a) => a.decided);

                setStages((prev) => {
                  const next = [...prev];
                  next[2] = {
                    ...next[2],
                    agents: allAgents,
                    gateStatus: anyDecided ? "passed" : allDone ? "waiting" : allAgents.length > 0 ? "locked" : "locked",
                  };
                  return next;
                });
              }
            );
            unsubs.push(solUnsub);
          } else {
            setStages((prev) => {
              const next = [...prev];
              next[2] = { ...next[2], agents: developAgents, gateStatus: "locked" };
              return next;
            });
          }
        }
      );
      unsubs.push(scInnerUnsub);
    });
    unsubs.push(scUnsub);

    return () => unsubs.forEach((u) => u());
  }, [user?.uid, problemId]);

  return { stages, loading };
}

function getDefaultStages(): StageData[] {
  return [
    { key: "discover", label: "Discover", icon: "🔍", agents: [], gateStatus: "locked" },
    { key: "define", label: "Define", icon: "📋", agents: [], gateStatus: "locked" },
    { key: "develop", label: "Develop", icon: "⚡", agents: [], gateStatus: "locked" },
    { key: "scope", label: "Scope", icon: "🎯", agents: [], gateStatus: "locked" },
    { key: "deliver", label: "Deliver", icon: "📦", agents: [], gateStatus: "locked" },
  ];
}

// Made with Bob
