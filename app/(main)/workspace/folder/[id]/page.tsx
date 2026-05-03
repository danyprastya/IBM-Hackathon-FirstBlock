"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ArrowLeft, Search, Plus } from "lucide-react";
import Link from "next/link";

// Mock data — will be replaced with Firestore queries
const MOCK_FOLDER_IDEAS: Record<string, { name: string; ideas: Array<{ id: string; title: string; folder: string; date: string }> }> = {
  "food-bev": {
    name: "Food & Bev",
    ideas: [
      { id: "1", title: "Meal prep delivery for college dorms", folder: "Food & Bev", date: "2 hours ago" },
      { id: "2", title: "Ghost kitchen for trending TikTok recipes", folder: "Food & Bev", date: "Apr 30" },
      { id: "3", title: "Healthy vending machines in gyms", folder: "Food & Bev", date: "Apr 26" },
    ],
  },
  "tech-ideas": {
    name: "Tech Ideas",
    ideas: [],
  },
  "side-hustles": {
    name: "Side Hustles",
    ideas: [],
  },
  drafts: {
    name: "Drafts",
    ideas: [
      { id: "4", title: "Welcome to FirstBlock 👋", folder: "Drafts", date: "Just Now" },
    ],
  },
};

export default function FolderPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const folderId = params.id as string;
  const folderData = MOCK_FOLDER_IDEAS[folderId] || { name: "Folder", ideas: [] };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 pt-12 pb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-text-heading rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-sm" />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase text-text-heading">
            First Block
          </span>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-sm font-semibold text-text-secondary">
              {(user?.displayName || "U").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </header>

      {/* Back + Title */}
      <div className="px-6 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center -ml-1 mb-2"
        >
          <ArrowLeft className="w-5 h-5 text-text-heading" />
        </button>
        <h1 className="text-2xl font-bold text-text-heading">{folderData.name}</h1>
      </div>

      {/* Search */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-3 px-4 py-3 bg-input-bg rounded-xl">
          <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="What were you working on?"
            className="flex-1 bg-transparent text-text-heading placeholder:text-text-muted text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Ideas grid */}
      <div className="px-6 flex-1">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Recents
        </h2>

        {folderData.ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-text-muted text-sm">No ideas in this folder yet.</p>
            <p className="text-text-muted text-xs mt-1">Tap + to add your first idea.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {folderData.ideas.map((idea) => (
              <Link
                key={idea.id}
                href={`/workspace/idea/${idea.id}`}
                className="p-4 bg-white border border-gray-200 rounded-xl"
              >
                <p className="text-xs text-text-muted">{idea.date}</p>
                <h3 className="text-sm font-semibold text-text-heading mt-1 leading-snug">
                  {idea.title}
                </h3>
                <span className="inline-block mt-3 px-2.5 py-1 bg-input-bg rounded-md text-xs text-text-secondary font-medium">
                  {idea.folder}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/workspace/new"
        className="fixed bottom-8 right-6 w-14 h-14 rounded-full bg-accent-primary text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}

// Made with Bob
