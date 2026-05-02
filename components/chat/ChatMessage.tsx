"use client";

import { User, Bot } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-accent-primary" />
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-accent-primary text-white"
              : "bg-bg-card border border-border text-text-primary"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </p>
        </div>
        {timestamp && (
          <span className="text-xs text-text-muted px-2">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-accent-primary" />
        </div>
      )}
    </div>
  );
}

// Made with Bob
