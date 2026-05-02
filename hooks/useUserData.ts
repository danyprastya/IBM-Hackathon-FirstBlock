"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS, UserDocument } from "@/lib/firebase/collections";
import { useAuth } from "@/lib/contexts/AuthContext";

export function useUserData() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Real-time listener for user document
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.USERS, user.uid),
      (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserDocument);
        } else {
          setUserData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching user data:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { userData, loading, error };
}

// Made with Bob
