"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useProblems } from "@/hooks/useProblems";
import { ArrowLeft, Search, Plus, FileText, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

function MobileFolderView({ folderName }: { folderName: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { folders, loading } = useProblems();
  const [searchQuery, setSearchQuery] = useState("");

  const decodedName = decodeURIComponent(folderName);
  const ideas = folders[decodedName] || [];

  const filtered = searchQuery.trim()
    ? ideas.filter(
        (p) =>
          p.rawInput.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.cleanedStatement.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ideas;

  return (
    <div className="min-h-screen bg-white flex flex-col md:hidden">
      <header className="px-6 pt-12 pb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 bg-text-heading rounded-lg flex items-center justify-center">
            <div className="size-4 border-2 border-white rounded-sm" />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase text-text-heading">
            First Block
          </span>
        </div>
        <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-sm font-semibold text-text-secondary">
              {(user?.displayName || "U").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </header>

      <div className="px-6 pb-4">
        <button onClick={() => router.back()} className="flex items-center -ml-1 mb-2">
          <ArrowLeft className="size-5 text-text-heading" />
        </button>
        <h1 className="text-2xl font-bold text-text-heading">{decodedName}</h1>
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-center gap-3 px-4 py-3 bg-input-bg rounded-xl">
          <Search className="size-4 text-text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="What were you working on?"
            className="flex-1 bg-transparent text-text-heading placeholder:text-text-muted text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="px-6 flex-1">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Recents
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-text-muted">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-text-muted text-sm">No ideas in this folder yet.</p>
            <p className="text-text-muted text-xs mt-1">Tap + to add your first idea.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((idea) => {
              const title = idea.cleanedStatement || idea.rawInput.slice(0, 50) + (idea.rawInput.length > 50 ? "…" : "");
              return (
                <Link key={idea.id} href={`/workspace/idea/${idea.id}`} className="p-4 bg-white border border-gray-200 rounded-xl">
                  <p className="text-xs text-text-muted">{idea.createdAt.toLocaleDateString()}</p>
                  <h3 className="text-sm font-semibold text-text-heading mt-1 leading-snug">{title}</h3>
                  <span className="inline-block mt-3 px-2.5 py-1 bg-input-bg rounded-md text-xs text-text-secondary font-medium">
                    {decodedName}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Link
        href="/workspace/new"
        className="fixed bottom-8 right-6 size-14 rounded-full bg-accent-primary text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform md:hidden"
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}

function DesktopFolderView({ folderName }: { folderName: string }) {
  const { folders, loading } = useProblems();
  const decodedName = decodeURIComponent(folderName);
  const ideas = folders[decodedName] || [];

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-text-heading mb-1">{decodedName}</h1>
        <p className="text-text-secondary text-sm mb-6">
          {ideas.length} idea{ideas.length !== 1 ? "s" : ""}
        </p>

        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-text-muted">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-muted text-sm mb-4">No ideas in this folder yet.</p>
            <Link
              href="/workspace/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-colors"
            >
              <Plus className="size-4" />
              Add Idea
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ideas.map((idea) => {
              const title = idea.cleanedStatement || idea.rawInput.slice(0, 60) + (idea.rawInput.length > 60 ? "…" : "");
              return (
                <Link
                  key={idea.id}
                  href={`/workspace/idea/${idea.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-accent-primary hover:bg-input-bg transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-text-muted" />
                    <div>
                      <h3 className="text-sm font-semibold text-text-heading">{title}</h3>
                      <p className="text-xs text-text-muted">{idea.createdAt.toLocaleDateString()}</p>
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

export default function FolderPage() {
  const params = useParams();
  const folderId = params.id as string;

  return (
    <>
      <MobileFolderView folderName={folderId} />
      <div className="hidden md:flex h-screen">
        <WorkspaceLayout>
          <DesktopFolderView folderName={folderId} />
        </WorkspaceLayout>
      </div>
    </>
  );
}

// Made with Bob
