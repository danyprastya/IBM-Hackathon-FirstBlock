"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Loader2, Download } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { useProblems } from "@/hooks/useProblems";

function MobileNewIdea() {
  const router = useRouter();
  const { createProblem } = useProblems();
  const [ideaText, setIdeaText] = useState("");
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);

  const handleSave = async () => {
    if (!ideaText.trim()) return;
    setSaving(true);
    const id = await createProblem(ideaText.trim());
    setSaving(false);
    if (id) router.push(`/workspace/idea/${id}`);
  };

  const handleResearch = async () => {
    if (!ideaText.trim()) return;
    setResearching(true);

    const id = await createProblem(ideaText.trim());
    if (!id) {
      setResearching(false);
      return;
    }

    try {
      const res = await fetch("/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: id, problemStatement: ideaText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Research start failed:", res.status, data);
        setResearching(false);
        return;
      }
    } catch (err) {
      console.error("Research trigger error:", err);
      setResearching(false);
      return;
    }

    router.push(`/workspace/idea/${id}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:hidden">
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
          <ArrowLeft className="w-5 h-5 text-text-heading" />
        </button>
        <button onClick={handleSave} disabled={saving || !ideaText.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Save
        </button>
      </header>

      <div className="flex-1 px-6 pb-32">
        <textarea
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          placeholder="What's the idea…"
          autoFocus
          className="w-full h-32 bg-transparent text-2xl font-semibold text-text-heading placeholder:text-gray-300 focus:outline-none resize-none leading-relaxed"
        />
        <p className="text-sm text-text-muted -mt-2 mb-6">Describe it like you&apos;re texting a friend about it.</p>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-heading">Suggested</h3>
          <button
            onClick={() =>
              setIdeaText(
                "I want to build a meal prep delivery service for college students in dorms. Most dorm rooms only have a microwave and mini fridge. Students eat badly because cooking isn't an option and eating out is expensive. What if there was a weekly subscription for prepped meals delivered every Sunday?"
              )
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-text-heading"
          >
            <span className="text-text-muted">↳</span>
            Use example problem
          </button>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <button
          onClick={handleResearch}
          disabled={!ideaText.trim() || researching}
          className="flex items-center gap-2 px-8 py-4 rounded-full bg-accent-primary text-white font-semibold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {researching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {researching ? "Starting research..." : "Research with AI"}
        </button>
      </div>
    </div>
  );
}

function DesktopNewIdea() {
  const router = useRouter();
  const { createProblem } = useProblems();
  const [ideaText, setIdeaText] = useState("");
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);

  const handleSave = async () => {
    if (!ideaText.trim()) return;
    setSaving(true);
    const id = await createProblem(ideaText.trim());
    setSaving(false);
    if (id) router.push(`/workspace/idea/${id}`);
  };

  const handleResearch = async () => {
    if (!ideaText.trim()) return;
    setResearching(true);
    const id = await createProblem(ideaText.trim());
    if (!id) { setResearching(false); return; }

    try {
      const res = await fetch("/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: id, problemStatement: ideaText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Research start failed:", res.status, data);
        setResearching(false);
        return;
      }
    } catch (err) {
      console.error("Research trigger error:", err);
      setResearching(false);
      return;
    }

    router.push(`/workspace/idea/${id}`);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Toolbar */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-3 flex items-center justify-between z-10">
        <span className="text-sm font-medium text-text-heading">New Idea</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !ideaText.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-heading hover:bg-input-bg transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Save Draft
          </button>
          <button
            onClick={handleResearch}
            disabled={!ideaText.trim() || researching}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40"
          >
            {researching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {researching ? "Starting..." : "Research with AI"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-2xl mx-auto px-8 py-10">
        <textarea
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          placeholder="What's the idea…"
          autoFocus
          className="w-full min-h-[200px] bg-transparent text-2xl font-semibold text-text-heading placeholder:text-gray-300 focus:outline-none resize-none leading-relaxed"
        />
        <p className="text-sm text-text-muted mb-8">
          Describe it like you&apos;re explaining to a friend. No structure needed — just dump your thoughts.
        </p>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-heading">Quick starters</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                setIdeaText(
                  "I want to build a meal prep delivery service for college students in dorms. Most dorm rooms only have a microwave and mini fridge. Students eat badly because cooking isn't an option and eating out is expensive. What if there was a weekly subscription for prepped meals delivered every Sunday?"
                )
              }
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-text-heading hover:bg-input-bg transition-colors"
            >
              <span>↳</span> Use example problem
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
