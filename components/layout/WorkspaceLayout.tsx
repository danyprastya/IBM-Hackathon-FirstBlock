"use client";

import { useState, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { AgentPanel } from "./AgentPanel";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentPanelCollapsed, setAgentPanelCollapsed] = useState(true);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Left: Folder explorer sidebar (desktop only) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Center: Main content area */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {children}
      </main>

      {/* Right: AI Agent panel (desktop lg+ only) */}
      <AgentPanel
        collapsed={agentPanelCollapsed}
        onToggle={() => setAgentPanelCollapsed(!agentPanelCollapsed)}
      />
    </div>
  );
}

// Made with Bob
