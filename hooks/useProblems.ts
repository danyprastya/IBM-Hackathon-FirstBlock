"use client";

import { useEffect, useCallback, useMemo } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import {
  usePipelineStore,
  subscriptions,
  selectors,
} from "@/lib/store";
import type { Problem } from "@/lib/store";

export type { Problem };

export function useProblems() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // Mount the store subscription
  useEffect(() => {
    if (!uid) return;
    return subscriptions.problems(uid);
  }, [uid]);

  // Memoize selectors so their reference stays stable across renders.
  // Without this, each render creates a new selector fn → Zustand's
  // useSyncExternalStore sees a new getServerSnapshot → infinite loop.
  const selectProblems = useMemo(() => selectors.selectProblems(uid), [uid]);
  const selectFolders = useMemo(() => selectors.selectFolders(uid), [uid]);
  const loadingKey = `problems:${uid}`;
  const selectLoading = useMemo(() => selectors.selectLoading(loadingKey), [loadingKey]);
  const selectError = useMemo(() => selectors.selectError(loadingKey), [loadingKey]);

  const problems = usePipelineStore(selectProblems);
  const folders = usePipelineStore(selectFolders);
  const loading = usePipelineStore(selectLoading);
  const error = usePipelineStore(selectError);

  // Create a new problem (raw dump)
  const createProblem = useCallback(
    async (rawInput: string, folder?: string, htmlContent?: string): Promise<string | null> => {
      if (!uid) return null;

      try {
        const docRef = await addDoc(
          collection(db, "users", uid, "problems"),
          {
            rawInput,
            htmlContent: htmlContent || "",
            cleanedStatement: "", // AI will clean this later
            inputType: "text" as const,
            folder: folder || "Drafts",
            createdAt: serverTimestamp(),
          }
        );
        return docRef.id;
      } catch (err) {
        console.error("Create problem error:", err);
        return null;
      }
    },
    [uid]
  );

  return {
    problems,
    folders,
    loading,
    error,
    createProblem,
  };
}

// Made with Bob
