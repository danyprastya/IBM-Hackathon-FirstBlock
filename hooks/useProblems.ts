"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";

export interface Problem {
  id: string;
  /** Verbatim founder text. Never rewritten. */
  rawInput: string;
  /**
   * Short display label. AI generates once on creation; founder can rename.
   * Empty string until the title-generation task completes — UI should fall
   * back to a truncated rawInput when this is empty.
   */
  title: string;
  inputType: "text" | "voice";
  createdAt: Date;
  /** Folder label — defaults to "Drafts". */
  folder?: string;
}

export function useProblems() {
  const { user } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener on problems subcollection
  useEffect(() => {
    if (!user?.uid) {
      setProblems([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "problems"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            rawInput: data.rawInput || "",
            // Migration-safe: prefer new `title`; fall back to legacy
            // `cleanedStatement` if old docs still carry it; else "".
            title: data.title || data.cleanedStatement || "",
            inputType: data.inputType || "text",
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : new Date(data.createdAt),
            folder: data.folder || "Drafts",
          } satisfies Problem;
        });
        setProblems(docs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Problems listener error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  /**
   * Create a new problem via the server route. The route persists rawInput
   * verbatim and fires a Trigger.dev task to generate the title in the
   * background — the snapshot listener will deliver the title when ready.
   */
  const createProblem = useCallback(
    async (rawInput: string, folder?: string): Promise<string | null> => {
      if (!user?.uid) return null;

      try {
        const res = await fetch("/api/agents/problems", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawInput,
            inputType: "text",
            ...(folder ? { folder } : {}),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `create_problem_${res.status}`);
        }
        const json = (await res.json()) as { problem: { id: string } };
        return json.problem.id;
      } catch (err) {
        console.error("Create problem error:", err);
        setError((err as Error).message);
        return null;
      }
    },
    [user?.uid]
  );

  /** Founder rename — title and/or folder. rawInput is intentionally not editable here. */
  const updateProblem = useCallback(
    async (
      problemId: string,
      patch: { title?: string; folder?: string }
    ): Promise<boolean> => {
      if (!user?.uid) return false;
      try {
        const res = await fetch(`/api/agents/problems/${problemId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `update_problem_${res.status}`);
        }
        return true;
      } catch (err) {
        console.error("Update problem error:", err);
        setError((err as Error).message);
        return false;
      }
    },
    [user?.uid]
  );

  // Group problems by folder
  const folders = problems.reduce<Record<string, Problem[]>>((acc, p) => {
    const f = p.folder || "Drafts";
    if (!acc[f]) acc[f] = [];
    acc[f].push(p);
    return acc;
  }, {});

  return {
    problems,
    folders,
    loading,
    error,
    createProblem,
    updateProblem,
  };
}

// Made with Bob
