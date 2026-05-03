"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePipelineStore, subscriptions, selectors } from "@/lib/store";

export function useSuccessMetrics(
  problemId: string | null,
  researchId: string | null,
  scId: string | null,
  solId: string | null
) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid || !problemId || !researchId || !scId || !solId) return;
    return subscriptions.successMetrics(uid, problemId, researchId, scId, solId);
  }, [uid, problemId, researchId, scId, solId]);

  const p = problemId ?? "";
  const r = researchId ?? "";
  const s = scId ?? "";
  const sol = solId ?? "";
  const loadKey = `successMetrics:${uid ?? ""}:${p}:${r}:${s}:${sol}`;

  const selectList = useMemo(
    () => selectors.selectSuccessMetricsList(p, r, s, sol),
    [p, r, s, sol]
  );
  const selectActive = useMemo(
    () => selectors.selectActiveSuccessMetrics(p, r, s, sol),
    [p, r, s, sol]
  );
  const selectLoading = useMemo(() => selectors.selectLoading(loadKey), [loadKey]);

  const list = usePipelineStore(selectList);
  const active = usePipelineStore(selectActive);
  const loading = usePipelineStore(selectLoading);

  return { list, active, loading };
}

// Made with Bob
