"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface WorkspaceLayoutProps {
  children: ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

// Made with Bob
