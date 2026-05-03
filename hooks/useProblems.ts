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

/**
 * Live list of the user's problems. Mounts a Firestore listener (ref-counted
 * so multiple components share one), exposes folder grouping derived locally,
 * and surfaces the create/update mutations.
 *
 * Backwards-compatible shape with the previous direct-Firestore hook.
 */
export function useProblems() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // Mount the store subscription
  useEffect(() => {
    if (!uid) return;
    return subscriptions.problems(uid);
  }, [uid]);

  const problems = usePipelineStore(selectors.selectProblems(uid));
  const loading = usePipelineStore(selectors.selectLoading(`problems:${uid ?? ""}`));
  const error = usePipelineStore(selectors.selectError(`problems:${uid ?? ""}`));

  // Group locally so the store doesn't churn a new object every render
  // (which would re-trigger useSyncExternalStore and infinite-loop).
  const folders = useMemo<Record<string, Problem[]>>(() => {
    return problems.reduce<Record<string, Problem[]>>((acc, p) => {
      const f = p.folder ?? "Drafts";
      (acc[f] ??= []).push(p);
      return acc;
    }, {});
  }, [problems]);

  // Create a new problem (raw dump)
  const createProblem = useCallback(
    async (rawInput: string, folder?: string, htmlContent?: string, providedTitle?: string): Promise<string | null> => {
      if (!uid) return null;

      // Derive a short title from the first non-empty sentence / line (max 60 chars) if not provided
      let finalTitle = providedTitle?.trim();
      if (!finalTitle) {
        const firstLine = rawInput
          .replace(/<[^>]+>/g, " ")  // strip any residual HTML
          .split(/[\n.!?]/)
          .map((s) => s.trim())
          .find((s) => s.length > 0) ?? "";
        finalTitle = firstLine.length > 60 ? firstLine.slice(0, 60) + "…" : firstLine;
      }

      try {
        const docRef = await addDoc(
          collection(db, "users", uid, "problems"),
          {
            rawInput,
            title: finalTitle,
            htmlContent: htmlContent || "",
            cleanedStatement: "",
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
