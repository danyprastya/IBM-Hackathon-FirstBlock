"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import {
  usePipelineStore,
  subscriptions,
  selectors,
} from "@/lib/store";
import type { Research } from "@/lib/store";

/**
 * Live single research doc. Subscribes to the parent's research list and
 * picks the matching id (so concurrent components share one listener).
 */
export function useResearch(problemId: string | null, researchId: string | null) {
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

  const list = usePipelineStore(selectResearches);
  const loading = usePipelineStore(selectLoading);
  const error = usePipelineStore(selectError);

  const research: Research | null = researchId
    ? list.find((r) => r.id === researchId) ?? null
    : null;

  return { research, loading, error };
}

// Made with Bob
