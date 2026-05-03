"use client";

import { useEffect } from "react";
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

  const list = usePipelineStore(
    selectors.selectResearches(problemId ?? "")
  );
  const loading = usePipelineStore(
    selectors.selectLoading(`researches:${uid ?? ""}:${problemId ?? ""}`)
  );
  const error = usePipelineStore(
    selectors.selectError(`researches:${uid ?? ""}:${problemId ?? ""}`)
  );

  const research: Research | null = researchId
    ? list.find((r) => r.id === researchId) ?? null
    : null;

  return { research, loading, error };
}

// Made with Bob
