"use client";

import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { StickyBoard } from "@/components/sticky/StickyBoard";
import { useChat } from "@/hooks/useChat";

export default function WorkspacePage() {
  const { messages, loading, isTyping, error, sendMessage } = useChat();

  return (
    <WorkspaceLayout>
      <div className="h-full flex">
        {/* Chat Panel - 60% */}
        <div className="w-[60%] h-full border-r border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <h1 className="text-2xl font-bold text-text-primary">AI Assistant</h1>
            <p className="text-sm text-text-secondary mt-1">
              Get personalized business advice and guidance
            </p>
            {error && (
              <div className="mt-3 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                {error}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatWindow
              messages={messages}
              onSendMessage={sendMessage}
              loading={loading}
              isTyping={isTyping}
            />
          </div>
        </div>

        {/* Sticky Notes Panel - 40% */}
        <div className="w-[40%] h-full flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-text-primary">Quick Notes</h2>
            <p className="text-sm text-text-secondary mt-1">
              Capture your ideas and insights
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <StickyBoard />
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

// Made with Bob
