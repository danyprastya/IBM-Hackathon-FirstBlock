"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePipelineStore, subscriptions, selectors } from "@/lib/store";

export function usePhases(
  problemId: string | null,
  researchId: string | null,
  scId: string | null,
  solId: string | null,
  prdId: string | null
) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid || !problemId || !researchId || !scId || !solId || !prdId) return;
    return subscriptions.phases(uid, problemId, researchId, scId, solId, prdId);
  }, [uid, problemId, researchId, scId, solId, prdId]);

  const p = problemId ?? "";
  const r = researchId ?? "";
  const s = scId ?? "";
  const sol = solId ?? "";
  const prd = prdId ?? "";
  const loadKey = `phases:${uid ?? ""}:${p}:${r}:${s}:${sol}:${prd}`;

  const selectPhases = useMemo(
    () => selectors.selectPhases(p, r, s, sol, prd),
    [p, r, s, sol, prd]
  );
  const selectLoading = useMemo(() => selectors.selectLoading(loadKey), [loadKey]);

  const phases = usePipelineStore(selectPhases);
  const loading = usePipelineStore(selectLoading);

  return { phases, loading };
}

// Made with Bob
