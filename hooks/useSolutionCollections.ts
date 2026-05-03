"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePipelineStore, subscriptions, selectors } from "@/lib/store";

export function useSolutionCollections(
  problemId: string | null,
  researchId: string | null
) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid || !problemId || !researchId) return;
    return subscriptions.solutionCollections(uid, problemId, researchId);
  }, [uid, problemId, researchId]);

  const collections = usePipelineStore(
    selectors.selectSolutionCollections(problemId ?? "", researchId ?? "")
  );
  const loading = usePipelineStore(
    selectors.selectLoading(
      `solutionCollections:${uid ?? ""}:${problemId ?? ""}:${researchId ?? ""}`
    )
  );

  return { collections, loading };
}

// Made with Bob
