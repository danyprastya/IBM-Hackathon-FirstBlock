"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePipelineStore, subscriptions, selectors } from "@/lib/store";

/** All research versions for a problem, sorted by createdAt asc. */
export function useResearches(problemId: string | null) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid || !problemId) return;
    return subscriptions.researches(uid, problemId);
  }, [uid, problemId]);

  const pid = problemId ?? "";
  const loadKey = `researches:${uid ?? ""}:${pid}`;

  const selectResearches = useMemo(() => selectors.selectResearches(pid), [pid]);
  const selectLoading = useMemo(() => selectors.selectLoading(loadKey), [loadKey]);
  const selectError = useMemo(() => selectors.selectError(loadKey), [loadKey]);

  const researches = usePipelineStore(selectResearches);
  const loading = usePipelineStore(selectLoading);
  const error = usePipelineStore(selectError);

  return { researches, loading, error };
}

// Made with Bob
