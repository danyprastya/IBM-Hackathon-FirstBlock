"use client";

import { useEffect } from "react";
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

  const list = usePipelineStore(
    selectors.selectSuccessMetricsList(
      problemId ?? "", researchId ?? "", scId ?? "", solId ?? ""
    )
  );
  const active = usePipelineStore(
    selectors.selectActiveSuccessMetrics(
      problemId ?? "", researchId ?? "", scId ?? "", solId ?? ""
    )
  );
  const loading = usePipelineStore(
    selectors.selectLoading(
      `successMetrics:${uid ?? ""}:${problemId ?? ""}:${researchId ?? ""}:${scId ?? ""}:${solId ?? ""}`
    )
  );

  return { list, active, loading };
}

// Made with Bob
