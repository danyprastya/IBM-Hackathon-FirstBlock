"use client";

import { useEffect, useMemo } from "react";
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

  const p = problemId ?? "";
  const r = researchId ?? "";
  const s = scId ?? "";
  const loadKey = `solutions:${uid ?? ""}:${p}:${r}:${s}`;

  const selectSolutions = useMemo(
    () => selectors.selectSolutions(p, r, s),
    [p, r, s]
  );
  const selectLoading = useMemo(() => selectors.selectLoading(loadKey), [loadKey]);

  const solutions = usePipelineStore(selectSolutions);
  const loading = usePipelineStore(selectLoading);

  return { solutions, loading };
}

// Made with Bob
