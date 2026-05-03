"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { ProblemDocument } from "@/lib/firebase/collections";

export interface Problem {
  id: string;
  rawInput: string;
  cleanedStatement: string;
  inputType: "text" | "voice";
  createdAt: Date;
  /** Folder label — derived from user tags or default "Drafts" */
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
            cleanedStatement: data.cleanedStatement || "",
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

  // Create a new problem (raw dump)
  const createProblem = useCallback(
    async (rawInput: string, folder?: string): Promise<string | null> => {
      if (!user?.uid) return null;

      try {
        const docRef = await addDoc(
          collection(db, "users", user.uid, "problems"),
          {
            rawInput,
            cleanedStatement: "", // AI will clean this later
            inputType: "text" as const,
            folder: folder || "Drafts",
            createdAt: serverTimestamp(),
          }
        );
        return docRef.id;
      } catch (err) {
        console.error("Create problem error:", err);
        setError((err as Error).message);
        return null;
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
  };
}

// Made with Bob
