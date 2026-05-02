"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  checklistItems?: string[];
  timestamp: string;
}

export function useChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch chat history on mount
  const fetchMessages = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch("/api/ai/messages");
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      setMessages(data.messages || []);
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Send message to AI
  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    // Optimistically add user message
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send message");
      }

      const data = await response.json();
      
      // Add AI response
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      
      // Remove optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchMessages();
  }, [user]);

  return {
    messages,
    loading,
    isTyping,
    error,
    sendMessage,
    refetch: fetchMessages,
  };
}

// Made with Bob
