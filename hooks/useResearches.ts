"use client";

import { useEffect } from "react";
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

  const researches = usePipelineStore(selectors.selectResearches(problemId ?? ""));
  const loading = usePipelineStore(
    selectors.selectLoading(`researches:${uid ?? ""}:${problemId ?? ""}`)
  );
  const error = usePipelineStore(
    selectors.selectError(`researches:${uid ?? ""}:${problemId ?? ""}`)
  );

  return { researches, loading, error };
}

// Made with Bob
