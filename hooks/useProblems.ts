"use client";

import { useEffect, useCallback } from "react";
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

  const problems = usePipelineStore(selectors.selectProblems(uid));
  const folders = usePipelineStore(selectors.selectFolders(uid));
  const loading = usePipelineStore(selectors.selectLoading(`problems:${uid}`));
  const error = usePipelineStore(selectors.selectError(`problems:${uid}`));

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
