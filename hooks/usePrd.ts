"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePipelineStore, subscriptions, selectors } from "@/lib/store";

export function usePrds(
  problemId: string | null,
  researchId: string | null,
  scId: string | null,
  solId: string | null
) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid || !problemId || !researchId || !scId || !solId) return;
    return subscriptions.prds(uid, problemId, researchId, scId, solId);
  }, [uid, problemId, researchId, scId, solId]);

  const prds = usePipelineStore(
    selectors.selectPrds(problemId ?? "", researchId ?? "", scId ?? "", solId ?? "")
  );
  const active = usePipelineStore(
    selectors.selectActivePrd(problemId ?? "", researchId ?? "", scId ?? "", solId ?? "")
  );
  const loading = usePipelineStore(
    selectors.selectLoading(
      `prds:${uid ?? ""}:${problemId ?? ""}:${researchId ?? ""}:${scId ?? ""}:${solId ?? ""}`
    )
  );

  return { prds, active, loading };
}

// Made with Bob
