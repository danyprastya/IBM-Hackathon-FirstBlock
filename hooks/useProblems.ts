"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import {
  usePipelineStore,
  subscriptions,
  actions,
  selectors,
} from "@/lib/store";
import type { Problem } from "@/lib/store";

export type { Problem };

/**
 * Live list of the user's problems. Mounts a Firestore listener (ref-counted
 * so multiple components share one), exposes folder grouping, and surfaces
 * the create/update mutations.
 *
 * Backwards-compatible shape with the previous direct-Firestore hook.
 */
export function useProblems() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid) return;
    return subscriptions.problems(uid);
  }, [uid]);

  const problems = usePipelineStore(selectors.selectProblems(uid));
  const folders = usePipelineStore(selectors.selectFolders(uid));
  const loading = usePipelineStore(selectors.selectLoading(`problems:${uid ?? ""}`));
  const error = usePipelineStore(selectors.selectError(`problems:${uid ?? ""}`));

  return {
    problems,
    folders,
    loading,
    error,
    createProblem: async (rawInput: string, folder?: string) => {
      try {
        return await actions.submitProblem({ rawInput, folder });
      } catch (err) {
        console.error("createProblem:", err);
        return null;
      }
    },
    updateProblem: async (
      problemId: string,
      patch: { title?: string; folder?: string }
    ) => {
      try {
        await actions.updateProblem(problemId, patch);
        return true;
      } catch (err) {
        console.error("updateProblem:", err);
        return false;
      }
    },
  };
}

// Made with Bob
