"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";

export type HighlightColor = "yellow" | "green" | "blue" | "pink";

export interface Highlight {
  id: string;
  text: string;
  color: HighlightColor;
  /** Which section this highlight belongs to (e.g. "marketSignal", "painEvidence", "fullPrd") */
  field: string;
  /** Character offset within the field's text content */
  startOffset: number;
  endOffset: number;
  note?: string;
  createdAt: Date;
}

/**
 * Manages highlights for a given problem. Highlights are stored in a flat
 * subcollection: `users/{uid}/problems/{pid}/highlights/{hid}`
 *
 * Returns the full list + add/remove mutations.
 */
export function useHighlights(problemId: string | null) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !problemId) {
      setHighlights([]);
      setLoading(false);
      return;
    }

    const colRef = collection(
      db,
      "users",
      uid,
      "problems",
      problemId,
      "highlights"
    );

    const unsub = onSnapshot(
      query(colRef),
      (snap) => {
        setHighlights(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              text: data.text ?? "",
              color: data.color ?? "yellow",
              field: data.field ?? "",
              startOffset: data.startOffset ?? 0,
              endOffset: data.endOffset ?? 0,
              note: data.note,
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate()
                  : new Date(),
            } as Highlight;
          })
        );
        setLoading(false);
      },
      (err) => {
        console.error("[useHighlights] listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid, problemId]);

  const addHighlight = useCallback(
    async (input: Omit<Highlight, "id" | "createdAt">) => {
      if (!uid || !problemId) return;
      try {
        await addDoc(
          collection(db, "users", uid, "problems", problemId, "highlights"),
          {
            ...input,
            createdAt: serverTimestamp(),
          }
        );
      } catch (err) {
        console.error("[useHighlights] add error:", err);
      }
    },
    [uid, problemId]
  );

  const removeHighlight = useCallback(
    async (highlightId: string) => {
      if (!uid || !problemId) return;
      try {
        await deleteDoc(
          doc(db, "users", uid, "problems", problemId, "highlights", highlightId)
        );
      } catch (err) {
        console.error("[useHighlights] remove error:", err);
      }
    },
    [uid, problemId]
  );

  return { highlights, loading, addHighlight, removeHighlight };
}

// Made with Bob
