"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, Download, Sparkles, Loader2, CheckCircle2, AlertCircle, Pencil, X, Save } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useProblems } from "@/hooks/useProblems";
import { useResearches } from "@/hooks/useResearches";
import { RichEditor } from "@/components/editor/RichEditor";
import { actions, subscriptions } from "@/lib/store";
import type { Problem, Research } from "@/lib/store";

/** Strip HTML tags to get plain text */
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

function useIdeaData(ideaId: string) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // Ensure the single-doc subscription is mounted even if /workspace hasn't been visited.
  useEffect(() => {
    if (!uid || !ideaId) return;
    return subscriptions.problem(uid, ideaId);
  }, [uid, ideaId]);

  const { problems, loading: problemsLoading } = useProblems();
  const { researches: ascResearches, loading: researchesLoading } = useResearches(ideaId || null);

  const problem: Problem | null = problems.find((p) => p.id === ideaId) ?? null;
  // Idea page renders newest-first.
  const researches: Research[] = [...ascResearches].reverse();
  const loading = problemsLoading || researchesLoading;

  return { problem, researches, loading };
}

function ResearchBriefCard({ research }: { research: Research }) {
  const statusIcon = research.status === "complete"
    ? <CheckCircle2 className="w-4 h-4 text-success" />
    : research.status === "running"
    ? <Loader2 className="w-4 h-4 text-accent-primary animate-spin" />
    : <AlertCircle className="w-4 h-4 text-danger" />;

  return (
    <div className="p-4 rounded-xl border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="text-sm font-bold text-text-heading">
            Research {research.status === "running" ? "(in progress)" : ""}
          </span>
        </div>
        <span className="text-xs text-text-muted">
          {research.createdAt.toLocaleDateString()}
        </span>
      </div>

      {research.status === "complete" && research.brief && (
        <div className="space-y-3 pt-1">
          {research.brief.marketSignal && (
            <div>
              <h4 className="text-xs font-bold text-text-heading mb-0.5">Market signal</h4>
              <p className="text-sm text-text-primary leading-relaxed">{research.brief.marketSignal}</p>
            </div>
          )}
          {research.brief.painEvidence && (
            <div>
              <h4 className="text-xs font-bold text-text-heading mb-0.5">Pain evidence</h4>
              <p className="text-sm text-text-primary leading-relaxed">{research.brief.painEvidence}</p>
            </div>
          )}
          {research.brief.competitionNote && (
            <div>
              <h4 className="text-xs font-bold text-text-heading mb-0.5">Competition</h4>
              <p className="text-sm text-text-primary leading-relaxed">
                <span className="font-medium">{research.brief.competition}</span> — {research.brief.competitionNote}
              </p>
            </div>
          )}
          {research.brief.aiVerdict && (
            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
              research.brief.aiVerdict === "pursue" ? "bg-green-50 text-green-800" :
              research.brief.aiVerdict === "watch" ? "bg-yellow-50 text-yellow-800" :
              "bg-red-50 text-red-800"
            }`}>
              AI Verdict: {research.brief.aiVerdict.toUpperCase()} — {research.brief.aiReason}
            </div>
          )}
        </div>
      )}

      {research.status === "running" && (
        <div className="flex items-center gap-2 py-3 text-text-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Researching this problem...</span>
        </div>
      )}
    </div>
  );
}

function MobileIdeaDocument({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { problem, researches, loading } = useIdeaData(ideaId);
  const [showResearchSheet, setShowResearchSheet] = useState(false);
  const [triggeringResearch, setTriggeringResearch] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editHtml, setEditHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const startEditing = useCallback(() => {
    setEditHtml(problem?.htmlContent || (problem?.rawInput ? `<p>${problem.rawInput}</p>` : ""));
    setEditing(true);
  }, [problem]);

  useEffect(() => {
    if (problem && !editingTitle) {
      setTitleDraft(problem.title || problem.rawInput.slice(0, 60));
    }
  }, [problem, editingTitle]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && problem && !editing) {
      startEditing();
      router.replace(`/workspace/idea/${ideaId}`);
    }
  }, [searchParams, problem, editing, router, ideaId, startEditing]);

  const handleSaveTitle = async () => {
    if (!user?.uid || !titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    const currentTitle = problem?.title || problem?.rawInput.slice(0, 60);
    if (titleDraft.trim() !== currentTitle) {
      try {
        await actions.updateProblem(ideaId, { title: titleDraft.trim() });
      } catch (err) {
        console.error("Save title error:", err);
      }
    }
    setEditingTitle(false);
  };

  const handleResearch = async () => {
    if (!problem) return;
    setTriggeringResearch(true);
    try {
      await actions.startProblemResearch({
        problemId: ideaId,
        rawInput: problem.rawInput,
      });
    } catch (err) {
      console.error("Research trigger error:", err);
    }
    setTriggeringResearch(false);
  };

  const handleSaveEdit = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const problemRef = doc(db, "users", user.uid, "problems", ideaId);
      await updateDoc(problemRef, {
        rawInput: stripHtml(editHtml),
        htmlContent: editHtml,
      });
      setEditing(false);
    } catch (err) {
      console.error("Save error:", err);
    }
    setSaving(false);
  };

  const handleEditorChange = useCallback((html: string) => {
    setEditHtml(html);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center md:hidden">
        <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center md:hidden">
        <p className="text-text-muted">Idea not found</p>
      </div>
    );
  }

  const title = problem.title || problem.rawInput.slice(0, 60);

  return (
    <div className="min-h-screen bg-white flex flex-col md:hidden">
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
          <ArrowLeft className="w-5 h-5 text-text-heading" />
        </button>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </>
          ) : (
            <>
              <button onClick={startEditing} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading">
                <Pencil className="w-4 h-4" /> Edit
              </button>
              {researches.length > 0 && (
                <button onClick={() => setShowResearchSheet(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading">
                  <Clock className="w-4 h-4" /> Log
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <div className="px-6 pb-4 flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-input-bg text-xs font-medium text-text-muted">
          {new Date(problem.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="flex-1 px-6 pb-32">
        {editingTitle ? (
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") setEditingTitle(false);
            }}
            autoFocus
            className="w-full text-2xl font-bold text-text-heading leading-tight mb-6 bg-transparent border-b border-accent-primary focus:outline-none"
          />
        ) : (
          <div className="group flex items-center gap-2 mb-6">
            <h1 className="text-2xl font-bold text-text-heading leading-tight">{title || "Untitled Project"}</h1>
            <button
              onClick={() => setEditingTitle(true)}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-input-bg rounded-lg transition-all text-text-muted"
              title="Edit title"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}

        {editing ? (
          <RichEditor
            content={editHtml}
            onChange={handleEditorChange}
            placeholder="Start writing your idea here..."
          />
        ) : (
          <>
            {(!problem.htmlContent && !problem.rawInput.trim()) ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-muted bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <p className="mb-4 text-sm">This project board is empty.</p>
                <button onClick={startEditing} className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium transition-colors text-text-heading">
                  Start Writing
                </button>
              </div>
            ) : problem.htmlContent ? (
              <div
                className="rich-editor-content"
                dangerouslySetInnerHTML={{ __html: problem.htmlContent }}
              />
            ) : (
              problem.rawInput.split("\n\n").map((p, i) => (
                <p key={i} className="text-base text-text-primary leading-relaxed mb-4">{p}</p>
              ))
            )}
          </>
        )}
      </div>

      {!editing && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
          <button
            onClick={handleResearch}
            disabled={triggeringResearch}
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-accent-primary text-white font-semibold shadow-lg active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {triggeringResearch ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {triggeringResearch ? "Starting..." : "Research with AI"}
          </button>
        </div>
      )}

      {/* Research Sheet */}
      {showResearchSheet && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowResearchSheet(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[70vh] overflow-y-auto">
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-8 space-y-4">
              <h2 className="text-lg font-bold text-text-heading">Research Log</h2>
              {researches.map((r) => (
                <ResearchBriefCard key={r.id} research={r} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DesktopIdeaDocument({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { problem, researches, loading } = useIdeaData(ideaId);
  const [triggeringResearch, setTriggeringResearch] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editHtml, setEditHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    if (problem && !editingTitle) {
      setTitleDraft(problem.title || problem.rawInput.slice(0, 60));
    }
  }, [problem, editingTitle]);

  const handleSaveTitle = async () => {
    if (!user?.uid || !titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    const currentTitle = problem?.title || problem?.rawInput.slice(0, 60);
    if (titleDraft.trim() !== currentTitle) {
      try {
        await actions.updateProblem(ideaId, { title: titleDraft.trim() });
      } catch (err) {
        console.error("Save title error:", err);
      }
    }
    setEditingTitle(false);
  };

  const handleResearch = async () => {
    if (!problem) return;
    setTriggeringResearch(true);
    try {
      await actions.startProblemResearch({
        problemId: ideaId,
        rawInput: problem.rawInput,
      });
    } catch (err) {
      console.error("Research trigger error:", err);
    }
    setTriggeringResearch(false);
  };

  const startEditing = () => {
    setEditHtml(problem?.htmlContent || `<p>${problem?.rawInput || ""}</p>`);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const problemRef = doc(db, "users", user.uid, "problems", ideaId);
      await updateDoc(problemRef, {
        rawInput: stripHtml(editHtml),
        htmlContent: editHtml,
      });
      setEditing(false);
    } catch (err) {
      console.error("Save error:", err);
    }
    setSaving(false);
  };

  const handleEditorChange = useCallback((html: string) => {
    setEditHtml(html);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-muted">Idea not found</p>
      </div>
    );
  }

  const title = problem.title || problem.rawInput.slice(0, 60);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {new Date(problem.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-heading hover:bg-input-bg transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-heading hover:bg-input-bg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-heading hover:bg-input-bg transition-colors">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button
                onClick={handleResearch}
                disabled={triggeringResearch}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-60"
              >
                {triggeringResearch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {triggeringResearch ? "Starting..." : "Research with AI"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Document body */}
      <div className="flex-1 overflow-y-auto px-8 py-10">
        {editingTitle ? (
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") setEditingTitle(false);
            }}
            autoFocus
            className="w-full text-3xl font-bold text-text-heading leading-tight mb-8 bg-transparent border-b border-accent-primary focus:outline-none"
          />
        ) : (
          <div className="group flex items-center gap-2 mb-8">
            <h1 className="text-3xl font-bold text-text-heading leading-tight">{title || "Untitled Project"}</h1>
            <button
              onClick={() => setEditingTitle(true)}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-input-bg rounded-lg transition-all text-text-muted"
              title="Edit title"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}

        {editing ? (
          <RichEditor
            content={editHtml}
            onChange={handleEditorChange}
            placeholder="Start writing your idea here..."
          />
        ) : (
          <>
            {(!problem.htmlContent && !problem.rawInput.trim()) ? (
              <div className="flex flex-col items-center justify-center py-20 text-text-muted bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <p className="mb-4 text-sm">This project board is empty.</p>
                <button onClick={startEditing} className="px-5 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium transition-colors text-text-heading">
                  Start Writing
                </button>
              </div>
            ) : (
              <div className="mb-10">
                {problem.htmlContent ? (
                  <div
                    className="rich-editor-content"
                    dangerouslySetInnerHTML={{ __html: problem.htmlContent }}
                  />
                ) : (
                  problem.rawInput.split("\n\n").map((p, i) => (
                    <p key={i} className="text-base text-text-primary leading-[1.8] mb-5">{p}</p>
                  ))
                )}
              </div>
            )}

            {/* Research results inline */}
            {researches.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-text-heading flex items-center gap-2">
                  <Clock className="w-5 h-5 text-text-muted" />
                  Research Log
                </h2>
                {researches.map((r) => (
                  <ResearchBriefCard key={r.id} research={r} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function IdeaDocumentPage() {
  const params = useParams();
  const ideaId = params.id as string;

  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
      </div>
    }>
      {/* Mobile only */}
      <div className="md:hidden">
        <MobileIdeaDocument ideaId={ideaId} />
      </div>
      {/* Desktop only */}
      <div className="hidden md:flex h-screen">
        <WorkspaceLayout>
          <DesktopIdeaDocument ideaId={ideaId} />
        </WorkspaceLayout>
      </div>
    </Suspense>
  );
}

// Made with Bob
