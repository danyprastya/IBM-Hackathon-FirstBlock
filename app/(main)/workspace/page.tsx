"use client";

import { useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { useProblems } from "@/hooks/useProblems";
import { Search, Plus, ChevronRight, FolderOpen, FileText, Loader2, LayoutTemplate, Mic } from "lucide-react";
import Link from "next/link";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

function MobileHome() {
  const { user } = useAuth();
  const { userData } = useUserData();
  const { problems, folders, loading } = useProblems();
  const [searchQuery, setSearchQuery] = useState("");

  const displayName = userData?.name || user?.displayName || "there";
  const firstName = displayName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  // Recent = last 5 problems sorted by date
  const recents = problems.slice(0, 5);
  const folderNames = Object.keys(folders).sort((a, b) =>
    a === "Drafts" ? -1 : b === "Drafts" ? 1 : a.localeCompare(b)
  );

  return (
    <div className="min-h-screen bg-white flex flex-col md:hidden">
      <header className="px-6 pt-12 pb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 bg-text-heading rounded-lg flex items-center justify-center">
            <div className="size-4 border-2 border-white rounded-sm" />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase text-text-heading">First Block</span>
        </div>
        <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-sm font-semibold text-text-secondary">{firstName.charAt(0).toUpperCase()}</span>
          )}
        </div>
      </header>

      <div className="px-6 pb-6">
        <h1 className="text-2xl font-bold text-text-heading leading-tight">
          {greeting}, <span className="font-extrabold">{firstName}</span>
          <br />
          any new ideas brewing?
        </h1>
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-center gap-3 px-4 py-3 bg-input-bg rounded-xl">
          <Search className="size-4 text-text-muted flex-shrink-0" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="What were you working on?" className="flex-1 bg-transparent text-text-heading placeholder:text-text-muted text-sm focus:outline-none" />
        </div>
      </div>

      {/* Recents */}
      <div className="px-6 pb-6">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Recents</h2>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-text-muted">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : recents.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No ideas yet. Tap + to start!</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6">
            {recents.map((item) => {
              const title = item.title || item.rawInput.slice(0, 50) + (item.rawInput.length > 50 ? "…" : "");
              return (
                <Link key={item.id} href={`/workspace/idea/${item.id}`} className="min-w-[160px] p-4 bg-white border border-gray-200 rounded-xl flex-shrink-0 card-hover cursor-pointer">
                  <p className="text-xs text-text-muted">{item.createdAt.toLocaleDateString()}</p>
                  <h3 className="text-sm font-semibold text-text-heading mt-1 leading-snug">{title}</h3>
                  <span className="inline-block mt-3 px-2.5 py-1 bg-input-bg rounded-md text-xs text-text-secondary font-medium">{item.folder || "Drafts"}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Folders */}
      <div className="px-6 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Folders</h2>
        </div>
        {folderNames.length === 0 && !loading ? (
          <p className="text-sm text-text-muted py-4">No folders yet.</p>
        ) : (
          <div className="flex flex-col gap-1 stagger-fade">
            {folderNames.map((name) => (
              <Link key={name} href={`/workspace/folder/${encodeURIComponent(name)}`} className="flex items-center justify-between py-4 border-b border-gray-100 cursor-pointer transition-smooth hover:bg-input-bg hover:pl-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <FolderOpen className="size-5 text-text-muted" />
                  <span className="text-base font-medium text-text-heading">{name}</span>
                  <span className="text-xs text-text-muted">{folders[name].length}</span>
                </div>
                <ChevronRight className="size-4 text-text-muted" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <Link href="/workspace/new" className="fixed bottom-8 right-6 size-14 rounded-full bg-accent-primary text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform md:hidden">
        <Plus className="size-6" />
      </Link>
    </div>
  );
}

function DesktopHome() {
  const { user } = useAuth();
  const { userData } = useUserData();
  const { problems, loading } = useProblems();

  const displayName = userData?.name || user?.displayName || "there";
  const firstName = displayName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const recents = problems.slice(0, 10);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-text-heading mb-1">{greeting}, {firstName}</h1>
        <p className="text-text-secondary text-sm mb-8">Pick up where you left off, or dump a new idea.</p>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-4 mb-10 stagger-fade">
          <Link href="/workspace/new" className="p-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-accent-primary hover:bg-accent-soft transition-all text-center group card-hover cursor-pointer">
            <Plus className="size-8 mx-auto text-text-muted group-hover:text-accent-primary transition-colors mb-2" />
            <span className="text-sm font-semibold text-text-heading">New Idea</span>
            <p className="text-xs text-text-muted mt-1">Start from scratch</p>
          </Link>
          <div className="p-5 rounded-2xl border border-gray-200 hover:border-accent-primary hover:bg-accent-soft transition-all text-center cursor-pointer group card-hover">
            <LayoutTemplate className="size-8 mx-auto text-text-muted group-hover:text-accent-primary transition-colors mb-2" />
            <span className="text-sm font-semibold text-text-heading">Templates</span>
            <p className="text-xs text-text-muted mt-1">SaaS, service, product</p>
          </div>
          <div className="p-5 rounded-2xl border border-gray-200 hover:border-accent-primary hover:bg-accent-soft transition-all text-center cursor-pointer group card-hover">
            <Mic className="size-8 mx-auto text-text-muted group-hover:text-accent-primary transition-colors mb-2" />
            <span className="text-sm font-semibold text-text-heading">Voice Dump</span>
            <p className="text-xs text-text-muted mt-1">Talk through your idea</p>
          </div>
        </div>

        {/* Recent activity */}
        <h2 className="text-sm font-semibold text-text-heading mb-4">Recent Activity</h2>
        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-text-muted">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : recents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-muted text-sm">No ideas yet. Start by creating one!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 stagger-fade">
            {recents.map((item) => {
              const title = item.title || item.rawInput.slice(0, 60) + (item.rawInput.length > 60 ? "…" : "");
              return (
                <Link key={item.id} href={`/workspace/idea/${item.id}`} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-accent-primary hover:bg-input-bg transition-all card-hover cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-text-muted" />
                    <div>
                      <h3 className="text-sm font-semibold text-text-heading">{title}</h3>
                      <p className="text-xs text-text-muted">{item.folder || "Drafts"} · {item.createdAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-text-muted" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <>
      <MobileHome />
      <div className="hidden md:flex h-screen">
        <WorkspaceLayout>
          <DesktopHome />
        </WorkspaceLayout>
      </div>
    </>
  );
}

// Made with Bob
