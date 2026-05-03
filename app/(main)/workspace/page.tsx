"use client";

import { useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { Search, Plus, ChevronRight, FolderOpen, FileText } from "lucide-react";
import Link from "next/link";

// Temporary mock data — will be replaced with Firestore queries
const MOCK_RECENTS = [
  { id: "1", title: "Welcome to FirstBlock 👋", folder: "Drafts", updatedAt: "Just Now" },
];

const MOCK_FOLDERS = [
  { id: "drafts", name: "Drafts", icon: "file" },
  { id: "food-bev", name: "Food & Bev", icon: "folder" },
  { id: "tech-ideas", name: "Tech Ideas", icon: "folder" },
  { id: "side-hustles", name: "Side Hustles", icon: "folder" },
];

export default function WorkspacePage() {
  const { user } = useAuth();
  const { userData } = useUserData();
  const [searchQuery, setSearchQuery] = useState("");

  const displayName = userData?.name || user?.displayName || "there";
  const firstName = displayName.split(" ")[0];

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-text-heading rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-sm" />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase text-text-heading">
            First Block
          </span>
        </div>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-sm font-semibold text-text-secondary">
              {firstName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </header>

      {/* Greeting */}
      <div className="px-6 pb-6">
        <h1 className="text-2xl font-bold text-text-heading leading-tight">
          {greeting}, <span className="font-extrabold">{firstName}</span>
          <br />
          any new ideas brewing?
        </h1>
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

      {/* Recents */}
      <div className="px-6 pb-6">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Recents
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6">
          {MOCK_RECENTS.map((item) => (
            <Link
              key={item.id}
              href={`/workspace/idea/${item.id}`}
              className="min-w-[160px] p-4 bg-white border border-gray-200 rounded-xl flex-shrink-0"
            >
              <p className="text-xs text-text-muted">{item.updatedAt}</p>
              <h3 className="text-sm font-semibold text-text-heading mt-1 leading-snug">
                {item.title}
              </h3>
              <span className="inline-block mt-3 px-2.5 py-1 bg-input-bg rounded-md text-xs text-text-secondary font-medium">
                {item.folder}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Folders */}
      <div className="px-6 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Folders
          </h2>
          <button className="flex items-center gap-1 text-sm font-medium text-text-heading">
            <Plus className="w-4 h-4" />
            New Folder
          </button>
        </div>

        <div className="space-y-1">
          {MOCK_FOLDERS.map((folder) => (
            <Link
              key={folder.id}
              href={`/workspace/folder/${folder.id}`}
              className="flex items-center justify-between py-4 border-b border-gray-100"
            >
              <div className="flex items-center gap-3">
                {folder.icon === "file" ? (
                  <FileText className="w-5 h-5 text-text-muted" />
                ) : (
                  <FolderOpen className="w-5 h-5 text-text-muted" />
                )}
                <span className="text-base font-medium text-text-heading">
                  {folder.name}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </Link>
          ))}
        </div>
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
