"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Loader2, Download } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

function MobileNewIdea() {
  const router = useRouter();
  const [ideaText, setIdeaText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!ideaText.trim()) return;
    setSaving(true);
    setTimeout(() => { router.push("/workspace"); }, 500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:hidden">
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
          <ArrowLeft className="w-5 h-5 text-text-heading" />
        </button>
        <button onClick={handleSave} disabled={saving || !ideaText.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading disabled:opacity-40">
          <Download className="w-4 h-4" />
          Save
        </button>
      </header>

      <div className="flex-1 px-6 pb-32">
        <textarea
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          placeholder="What's the idea…"
          className="w-full h-32 bg-transparent text-2xl font-semibold text-text-heading placeholder:text-gray-300 focus:outline-none resize-none leading-relaxed"
        />
        <p className="text-sm text-text-muted -mt-2 mb-6">Describe it like you&apos;re texting a friend about it.</p>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-heading">Suggested</h3>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-text-heading">
            <span className="text-text-muted">↳</span>
            Use example problems
          </button>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <button disabled={!ideaText.trim()} className="flex items-center gap-2 px-8 py-4 rounded-full bg-accent-primary text-white font-semibold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-transform">
          <Sparkles className="w-5 h-5" />
          Research with AI
        </button>
      </div>
    </div>
  );
}

function DesktopNewIdea() {
  const router = useRouter();
  const [ideaText, setIdeaText] = useState("");

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Toolbar */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-heading">New Idea</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-heading hover:bg-input-bg transition-colors">
            <Download className="w-3.5 h-3.5" />
            Save Draft
          </button>
          <button
            disabled={!ideaText.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Research with AI
          </button>
        </div>
      </div>

      {/* Editor — Notion-style centered column */}
      <div className="max-w-2xl mx-auto px-8 py-10">
        <textarea
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          placeholder="What's the idea…"
          className="w-full min-h-[200px] bg-transparent text-2xl font-semibold text-text-heading placeholder:text-gray-300 focus:outline-none resize-none leading-relaxed"
        />
        <p className="text-sm text-text-muted mb-8">
          Describe it like you&apos;re explaining to a friend. No structure needed — just dump your thoughts.
        </p>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-heading">Quick starters</h3>
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-text-heading hover:bg-input-bg transition-colors">
              <span>↳</span> Use example problems
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-text-heading hover:bg-input-bg transition-colors">
              <span>📋</span> SaaS template
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-text-heading hover:bg-input-bg transition-colors">
              <span>🛍️</span> Physical product template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewIdeaPage() {
  return (
    <>
      <MobileNewIdea />
      <div className="hidden md:flex h-screen">
        <WorkspaceLayout>
          <DesktopNewIdea />
        </WorkspaceLayout>
      </div>
    </>
  );
}

// Made with Bob
