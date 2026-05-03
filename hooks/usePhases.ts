"use client";

import { useEffect } from "react";
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

  const phases = usePipelineStore(
    selectors.selectPhases(
      problemId ?? "", researchId ?? "", scId ?? "", solId ?? "", prdId ?? ""
    )
  );
  const loading = usePipelineStore(
    selectors.selectLoading(
      `phases:${uid ?? ""}:${problemId ?? ""}:${researchId ?? ""}:${scId ?? ""}:${solId ?? ""}:${prdId ?? ""}`
    )
  );

  return { phases, loading };
}

// Made with Bob
