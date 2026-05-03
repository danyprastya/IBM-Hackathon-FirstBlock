"use client";

import { useEffect } from "react";
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

  const mvps = usePipelineStore(
    selectors.selectMvps(problemId ?? "", researchId ?? "", scId ?? "", solId ?? "")
  );
  const active = usePipelineStore(
    selectors.selectActiveMvp(problemId ?? "", researchId ?? "", scId ?? "", solId ?? "")
  );
  const loading = usePipelineStore(
    selectors.selectLoading(
      `mvps:${uid ?? ""}:${problemId ?? ""}:${researchId ?? ""}:${scId ?? ""}:${solId ?? ""}`
    )
  );

  return { mvps, active, loading };
}

// Made with Bob
