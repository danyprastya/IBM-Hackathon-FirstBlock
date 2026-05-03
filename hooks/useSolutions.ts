"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePipelineStore, subscriptions, selectors } from "@/lib/store";

export function useSolutions(
  problemId: string | null,
  researchId: string | null,
  scId: string | null
) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid || !problemId || !researchId || !scId) return;
    return subscriptions.solutions(uid, problemId, researchId, scId);
  }, [uid, problemId, researchId, scId]);

  const solutions = usePipelineStore(
    selectors.selectSolutions(problemId ?? "", researchId ?? "", scId ?? "")
  );
  const loading = usePipelineStore(
    selectors.selectLoading(
      `solutions:${uid ?? ""}:${problemId ?? ""}:${researchId ?? ""}:${scId ?? ""}`
    )
  );

  return { solutions, loading };
}

// Made with Bob
