"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePipelineStore, subscriptions, selectors } from "@/lib/store";

/** All MVP versions for a solution; latest is the active one. */
export function useMvps(
  problemId: string | null,
  researchId: string | null,
  scId: string | null,
  solId: string | null
) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid || !problemId || !researchId || !scId || !solId) return;
    return subscriptions.mvps(uid, problemId, researchId, scId, solId);
  }, [uid, problemId, researchId, scId, solId]);

  const p = problemId ?? "";
  const r = researchId ?? "";
  const s = scId ?? "";
  const sol = solId ?? "";
  const loadKey = `mvps:${uid ?? ""}:${p}:${r}:${s}:${sol}`;

  const selectMvps = useMemo(() => selectors.selectMvps(p, r, s, sol), [p, r, s, sol]);
  const selectActive = useMemo(() => selectors.selectActiveMvp(p, r, s, sol), [p, r, s, sol]);
  const selectLoading = useMemo(() => selectors.selectLoading(loadKey), [loadKey]);

  const mvps = usePipelineStore(selectMvps);
  const active = usePipelineStore(selectActive);
  const loading = usePipelineStore(selectLoading);

  return { mvps, active, loading };
}

// Made with Bob
