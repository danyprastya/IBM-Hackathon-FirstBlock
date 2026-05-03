"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, Download, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { doc, onSnapshot, collection, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { ProblemDocument, ResearchDocument } from "@/lib/firebase/collections";

function useIdeaData(ideaId: string) {
  const { user } = useAuth();
  const [problem, setProblem] = useState<ProblemDocument | null>(null);
  const [researches, setResearches] = useState<ResearchDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !ideaId) return;

    // Listen to problem doc
    const problemUnsub = onSnapshot(
      doc(db, "users", user.uid, "problems", ideaId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProblem({
            id: snap.id,
            rawInput: data.rawInput || "",
            cleanedStatement: data.cleanedStatement || "",
            inputType: data.inputType || "text",
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          });
        }
        setLoading(false);
      }
    );

    // Listen to researches subcollection
    const researchQ = query(
      collection(db, "users", user.uid, "problems", ideaId, "researches"),
      orderBy("createdAt", "desc")
    );
    const researchUnsub = onSnapshot(researchQ, (snap) => {
      setResearches(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            status: data.status || "running",
            brief: data.brief || {},
            founderDecision: data.founderDecision || null,
            compactedContext: data.compactedContext || "",
          } as ResearchDocument;
        })
      );
    });

    return () => {
      problemUnsub();
      researchUnsub();
    };
  }, [user?.uid, ideaId]);

  return { problem, researches, loading };
}

function ResearchBriefCard({ research }: { research: ResearchDocument }) {
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
  const { problem, researches, loading } = useIdeaData(ideaId);
  const [showResearchSheet, setShowResearchSheet] = useState(false);
  const [triggeringResearch, setTriggeringResearch] = useState(false);

  const handleResearch = async () => {
    setTriggeringResearch(true);
    try {
      await fetch("/api/agents/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: ideaId }),
      });
    } catch (err) {
      console.error("Research trigger error:", err);
    }
    setTriggeringResearch(false);
  };

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

  const title = problem.cleanedStatement || problem.rawInput.slice(0, 60);

  return (
    <div className="min-h-screen bg-white flex flex-col md:hidden">
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
          <ArrowLeft className="w-5 h-5 text-text-heading" />
        </button>
        <div className="flex items-center gap-3">
          {researches.length > 0 && (
            <button onClick={() => setShowResearchSheet(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading">
              <Clock className="w-4 h-4" />
              Research Log
            </button>
          )}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading">
            <Download className="w-4 h-4" />
            Save
          </button>
        </div>
      </header>

      <div className="px-6 pb-4 flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-input-bg text-xs font-medium text-text-muted">
          {new Date(problem.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="flex-1 px-6 pb-32">
        <h1 className="text-2xl font-bold text-text-heading leading-tight mb-6">{title}</h1>
        {problem.rawInput.split("\n\n").map((p, i) => (
          <p key={i} className="text-base text-text-primary leading-relaxed mb-4">{p}</p>
        ))}
      </div>

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
  const { problem, researches, loading } = useIdeaData(ideaId);
  const [triggeringResearch, setTriggeringResearch] = useState(false);

  const handleResearch = async () => {
    setTriggeringResearch(true);
    try {
      await fetch("/api/agents/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: ideaId }),
      });
    } catch (err) {
      console.error("Research trigger error:", err);
    }
    setTriggeringResearch(false);
  };

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

  const title = problem.cleanedStatement || problem.rawInput.slice(0, 60);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Toolbar */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {new Date(problem.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-heading hover:bg-input-bg transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={handleResearch}
            disabled={triggeringResearch}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {triggeringResearch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {triggeringResearch ? "Starting..." : "Research with AI"}
          </button>
        </div>
      </div>

      {/* Document body */}
      <div className="max-w-2xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-bold text-text-heading leading-tight mb-8">{title}</h1>

        {/* Raw dump */}
        <div className="mb-10">
          {problem.rawInput.split("\n\n").map((p, i) => (
            <p key={i} className="text-base text-text-primary leading-[1.8] mb-5">{p}</p>
          ))}
        </div>

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
      </div>
    </div>
  );
}

export default function IdeaDocumentPage() {
  const params = useParams();
  const ideaId = params.id as string;

  return (
    <>
      <MobileIdeaDocument ideaId={ideaId} />
      <div className="hidden md:flex h-screen">
        <WorkspaceLayout>
          <DesktopIdeaDocument ideaId={ideaId} />
        </WorkspaceLayout>
      </div>
    </>
  );
}

// Made with Bob
