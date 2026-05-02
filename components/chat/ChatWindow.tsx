"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ChecklistBlock } from "./ChecklistBlock";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {loading ? (
            <div className="space-y-6">
              {/* Loading Skeletons */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4 max-w-md px-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-accent-primary" />
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
                <div key={message.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      </ScrollArea>

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
