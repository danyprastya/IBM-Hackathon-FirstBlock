"use client";

import { useState, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-bg-card p-4">
      <div className="flex gap-3 items-end">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          maxLength={2000}
          className="flex-1 px-4 py-3 bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-none min-h-[48px] max-h-[120px]"
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="h-12 w-12 p-0 flex-shrink-0"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
      <p className="text-xs text-text-muted mt-2 px-1">
        {message.length}/2000 characters • Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}

// Made with Bob
