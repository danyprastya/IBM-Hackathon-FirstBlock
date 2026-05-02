"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ChecklistBlock } from "./ChecklistBlock";
import { Loader2 } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  checklistItems?: string[];
  timestamp: string;
}

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  loading?: boolean;
  isTyping?: boolean;
}

export function ChatWindow({
  messages,
  onSendMessage,
  loading = false,
  isTyping = false,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Helper function to detect if content contains a numbered list
  const hasChecklist = (content: string): boolean => {
    const checklistPattern = /^\d+\.\s+.+$/m;
    return checklistPattern.test(content);
  };

  // Extract checklist items from content
  const extractChecklistItems = (content: string): string[] => {
    const lines = content.split("\n");
    const items: string[] = [];
    
    for (const line of lines) {
      const match = line.match(/^\d+\.\s+(.+)$/);
      if (match) {
        items.push(match[1].trim());
      }
    }
    
    return items;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-accent-primary" />
              <p className="text-text-secondary">Loading chat history...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                <div className="w-8 h-8 rounded-xl bg-accent-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  Start Your Journey
                </h3>
                <p className="text-text-secondary">
                  Ask me anything about starting your business. I&apos;m here to help you brainstorm ideas, validate concepts, and create actionable plans.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id}>
                <ChatMessage
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
                {message.role === "assistant" && hasChecklist(message.content) && (
                  <ChecklistBlock items={extractChecklistItems(message.content)} />
                )}
              </div>
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={onSendMessage}
        disabled={loading || isTyping}
        placeholder="Ask about business ideas, market research, or next steps..."
      />
    </div>
  );
}

// Made with Bob
