"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Sparkles, Loader2, Download } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { useProblems } from "@/hooks/useProblems";
import { RichEditor } from "@/components/editor/RichEditor";

/** Strip HTML tags to get plain text for API calls */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function MobileNewIdea() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createProblem } = useProblems();
  const [ideaHtml, setIdeaHtml] = useState("");
  const [ideaTitle, setIdeaTitle] = useState(searchParams.get("title") || "");
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);

  const plainText = stripHtml(ideaHtml).trim();

  const handleSave = async () => {
    if (!plainText) return;
    setSaving(true);
    const id = await createProblem(plainText, undefined, ideaHtml, ideaTitle);
    setSaving(false);
    if (id) router.push(`/workspace/idea/${id}`);
  };

  const handleResearch = async () => {
    if (!plainText) return;
    setResearching(true);

    const id = await createProblem(plainText, undefined, ideaHtml, ideaTitle);
    if (!id) {
      setResearching(false);
      return;
    }

    try {
      const res = await fetch("/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: id, problemStatement: plainText }),
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

  const handleEditorChange = useCallback((html: string) => {
    setIdeaHtml(html);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col md:hidden">
      <header className="px-6 pt-12 pb-4 flex items-center justify-between gap-3">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2 shrink-0">
          <ArrowLeft className="w-5 h-5 text-text-heading" />
        </button>
        <input
          type="text"
          value={ideaTitle}
          onChange={(e) => setIdeaTitle(e.target.value)}
          placeholder="Idea Title (optional)"
          className="flex-1 min-w-0 bg-transparent text-lg font-semibold text-text-heading placeholder:text-text-muted focus:outline-none"
        />
        <button onClick={handleSave} disabled={saving || !plainText} className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Save
        </button>
      </header>

      <div className="flex-1 px-6 pb-32">
        <RichEditor
          content=""
          onChange={handleEditorChange}
          placeholder="What's the idea… Describe it like you're texting a friend about it."
        />

        <div className="space-y-3 mt-6">
          <h3 className="text-sm font-semibold text-text-heading">Suggested</h3>
          <button
            onClick={() =>
              setIdeaHtml(
                "<p>I want to build a meal prep delivery service for college students in dorms. Most dorm rooms only have a microwave and mini fridge. Students eat badly because cooking isn't an option and eating out is expensive. What if there was a weekly subscription for prepped meals delivered every Sunday?</p>"
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
          disabled={!plainText || researching}
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
  const searchParams = useSearchParams();
  const { createProblem } = useProblems();
  const [ideaHtml, setIdeaHtml] = useState("");
  const [ideaTitle, setIdeaTitle] = useState(searchParams.get("title") || "");
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);

  const plainText = stripHtml(ideaHtml).trim();

  const handleSave = async () => {
    if (!plainText) return;
    setSaving(true);
    const id = await createProblem(plainText, undefined, ideaHtml, ideaTitle);
    setSaving(false);
    if (id) router.push(`/workspace/idea/${id}`);
  };

  const handleResearch = async () => {
    if (!plainText) return;
    setResearching(true);
    const id = await createProblem(plainText, undefined, ideaHtml, ideaTitle);
    if (!id) { setResearching(false); return; }

    try {
      const res = await fetch("/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: id, problemStatement: plainText }),
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

  const handleEditorChange = useCallback((html: string) => {
    setIdeaHtml(html);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-3 flex items-center justify-between z-10 gap-4">
        <input
          type="text"
          value={ideaTitle}
          onChange={(e) => setIdeaTitle(e.target.value)}
          placeholder="Give your project a title..."
          className="flex-1 min-w-0 bg-transparent text-lg font-semibold text-text-heading placeholder:text-text-muted focus:outline-none"
        />
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !plainText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-heading hover:bg-input-bg transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Save Draft
          </button>
          <button
            onClick={handleResearch}
            disabled={!plainText || researching}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40"
          >
            {researching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {researching ? "Starting..." : "Research with AI"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <RichEditor
          content=""
          onChange={handleEditorChange}
          placeholder="What's the idea… Describe it like you're explaining to a friend. No structure needed — just dump your thoughts."
        />

        <div className="space-y-3 mt-8">
          <h3 className="text-sm font-semibold text-text-heading">Quick starters</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                setIdeaHtml(
                  "<p>I want to build a meal prep delivery service for college students in dorms. Most dorm rooms only have a microwave and mini fridge. Students eat badly because cooking isn't an option and eating out is expensive. What if there was a weekly subscription for prepped meals delivered every Sunday?</p>"
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
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
      </div>
    }>
      {/* Mobile only */}
      <div className="md:hidden">
        <MobileNewIdea />
      </div>
      {/* Desktop only */}
      <div className="hidden md:flex h-screen">
        <WorkspaceLayout>
          <DesktopNewIdea />
        </WorkspaceLayout>
      </div>
    </Suspense>
  );
}

// Made with Bob
