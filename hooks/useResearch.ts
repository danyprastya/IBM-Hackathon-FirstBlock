"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PATHS, ResearchDocument } from "@/lib/firebase/collections";
import { useAuth } from "@/lib/contexts/AuthContext";

export function useResearch(problemId: string | null, researchId: string | null) {
  const { user } = useAuth();
  const [research, setResearch] = useState<ResearchDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(problemId && researchId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !problemId || !researchId) {
      setResearch(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const ref = doc(db, PATHS.research(user.uid, problemId, researchId));
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setResearch(snap.exists() ? (snap.data() as ResearchDocument) : null);
        setLoading(false);
      },
      (err) => {
        console.error("useResearch listener error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, problemId, researchId]);

  return { research, loading, error };
}
