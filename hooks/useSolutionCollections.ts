"use client";

import { useEffect, useMemo } from "react";
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

  const p = problemId ?? "";
  const r = researchId ?? "";
  const loadKey = `solutionCollections:${uid ?? ""}:${p}:${r}`;

  const selectCollections = useMemo(
    () => selectors.selectSolutionCollections(p, r),
    [p, r]
  );
  const selectLoading = useMemo(() => selectors.selectLoading(loadKey), [loadKey]);

  const collections = usePipelineStore(selectCollections);
  const loading = usePipelineStore(selectLoading);

  return { collections, loading };
}

// Made with Bob
