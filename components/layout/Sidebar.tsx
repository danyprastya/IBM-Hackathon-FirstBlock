"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FolderOpen,
  FolderClosed,
  Plus,
  Search,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { useProblems, type Problem } from "@/hooks/useProblems";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { userData } = useUserData();
  const { folders, loading: problemsLoading } = useProblems();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["Drafts"])
  );
  const [searchQuery, setSearchQuery] = useState("");

  const displayName = userData?.name || user?.displayName || "User";

  const toggleFolder = (name: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // Filter problems by search
  const filteredFolders: Record<string, Problem[]> = searchQuery.trim()
    ? Object.fromEntries(
        Object.entries(folders).map(([name, problems]) => [
          name,
          problems.filter(
            (p) =>
              p.rawInput.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.title.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        ]).filter(([, problems]) => (problems as Problem[]).length > 0)
      )
    : folders;

  const folderNames = Object.keys(filteredFolders).sort((a, b) =>
    a === "Drafts" ? -1 : b === "Drafts" ? 1 : a.localeCompare(b)
  );

  if (collapsed) {
    return (
      <aside className="hidden md:flex w-12 h-screen bg-white border-r border-gray-200 flex-col items-center py-4 gap-3">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-input-bg transition-colors" title="Expand sidebar">
          <PanelLeftOpen className="w-4 h-4 text-text-secondary" />
        </button>
        <Link href="/workspace" className="p-2 rounded-lg hover:bg-input-bg transition-colors" title="Home">
          <Home className="w-4 h-4 text-text-secondary" />
        </Link>
        <button className="p-2 rounded-lg hover:bg-input-bg transition-colors mt-auto" onClick={handleSignOut} title="Sign out">
          <LogOut className="w-4 h-4 text-text-secondary" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex w-64 h-screen bg-white border-r border-gray-200 flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <Link href="/workspace" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-text-heading rounded-lg flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-sm" />
          </div>
          <span className="text-sm font-bold text-text-heading">FirstBlock</span>
        </Link>
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-input-bg transition-colors">
          <PanelLeftClose className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-input-bg rounded-lg">
          <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ideas..."
            className="flex-1 bg-transparent text-sm text-text-heading placeholder:text-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* New Idea */}
      <div className="px-3 pb-3">
        <Link
          href="/workspace/new"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors w-full"
        >
          <Plus className="w-4 h-4" />
          New Idea
        </Link>
      </div>

      {/* Folder Tree */}
      <nav className="flex-1 overflow-y-auto px-2">
        <p className="px-2 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Projects
        </p>

        {problemsLoading ? (
          <div className="flex items-center gap-2 px-2 py-4 text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : folderNames.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <p className="text-xs text-text-muted">No ideas yet.</p>
            <p className="text-xs text-text-muted mt-1">Tap &quot;New Idea&quot; to start.</p>
          </div>
        ) : (
          folderNames.map((folderName) => {
            const ideas = filteredFolders[folderName];
            const isExpanded = expandedFolders.has(folderName);

            return (
              <div key={folderName}>
                {/* Folder row */}
                <button
                  onClick={() => toggleFolder(folderName)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-input-bg text-text-primary"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="w-4 h-4 text-text-muted flex-shrink-0" />
                  ) : (
                    <FolderClosed className="w-4 h-4 text-text-muted flex-shrink-0" />
                  )}
                  <span className="truncate">{folderName}</span>
                  <span className="ml-auto text-xs text-text-muted">{ideas.length}</span>
                </button>

                {/* Children */}
                {isExpanded && ideas.length > 0 && (
                  <div className="ml-4 border-l border-gray-100 pl-2">
                    {ideas.map((idea) => {
                      const title =
                        idea.title ||
                        idea.rawInput.slice(0, 50) + (idea.rawInput.length > 50 ? "…" : "");
                      return (
                        <Link
                          key={idea.id}
                          href={`/workspace/idea/${idea.id}`}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-input-bg ${
                            pathname === `/workspace/idea/${idea.id}`
                              ? "bg-accent-soft font-medium text-accent-primary"
                              : "text-text-secondary"
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-xs font-semibold text-accent-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-heading truncate">{displayName}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg hover:bg-input-bg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// Made with Bob
