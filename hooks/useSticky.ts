"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";

export interface Sticky {
  id: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export function useSticky() {
  const { user } = useAuth();
  const [stickies, setStickies] = useState<Sticky[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all stickies
  const fetchStickies = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch("/api/sticky");
      
      if (!response.ok) {
        throw new Error("Failed to fetch sticky notes");
      }

      const data = await response.json();
      setStickies(data.stickies || []);
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create new sticky
  const createSticky = async (content: string, color: string) => {
    try {
      const response = await fetch("/api/sticky", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, color }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create sticky note");
      }

      const data = await response.json();
      setStickies((prev) => [...prev, data.sticky]);
      return data.sticky;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  // Update sticky
  const updateSticky = async (id: string, content: string, color: string) => {
    try {
      const response = await fetch("/api/sticky", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, content, color }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update sticky note");
      }

      const data = await response.json();
      setStickies((prev) =>
        prev.map((s) => (s.id === id ? data.sticky : s))
      );
      return data.sticky;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  // Delete sticky
  const deleteSticky = async (id: string) => {
    try {
      const response = await fetch("/api/sticky", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete sticky note");
      }

      setStickies((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchStickies();
  }, [user]);

  return {
    stickies,
    loading,
    error,
    createSticky,
    updateSticky,
    deleteSticky,
    refetch: fetchStickies,
  };
}

// Made with Bob
