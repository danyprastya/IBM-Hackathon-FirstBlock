"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Eye, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { ResearchDocument, Verdict } from "@/lib/firebase/collections";

function useResearches(problemId: string) {
  const { user } = useAuth();
  const [researches, setResearches] = useState<ResearchDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !problemId) return;

    const q = query(
      collection(db, "users", user.uid, "problems", problemId, "researches"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
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
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid, problemId]);

  return { researches, loading };
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const config = {
    pursue: { bg: "bg-green-50", text: "text-green-800", icon: ThumbsUp, label: "Pursue" },
    watch: { bg: "bg-yellow-50", text: "text-yellow-800", icon: Eye, label: "Watch" },
    drop: { bg: "bg-red-50", text: "text-red-800", icon: ThumbsDown, label: "Drop" },
  }[verdict];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}

function CompetitionBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    crowded: { bg: "bg-red-50", text: "text-red-700" },
    white_space: { bg: "bg-green-50", text: "text-green-700" },
    graveyard: { bg: "bg-gray-100", text: "text-gray-700" },
  };
  const c = config[level] || config.graveyard;

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {level === "white_space" ? "White Space" : level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

interface BriefCardProps {
  research: ResearchDocument;
  index: number;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function BriefCard({ research, index, selected, onSelect, disabled }: BriefCardProps) {
  const brief = research.brief;
  const isComplete = research.status === "complete";
  const hasDecision = research.founderDecision !== null;

  return (
    <button
      onClick={onSelect}
      disabled={disabled || !isComplete}
      className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
        selected
          ? "border-accent-primary bg-accent-soft"
          : hasDecision
          ? "border-green-300 bg-green-50/50"
          : "border-gray-200 hover:border-gray-300"
      } ${disabled && !selected ? "opacity-60" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-text-heading">Brief #{index + 1}</span>
        <div className="flex items-center gap-2">
          {research.status === "running" && (
            <Loader2 className="size-4 text-accent-primary animate-spin" />
          )}
          {isComplete && brief?.aiVerdict && (
            <VerdictBadge verdict={brief.aiVerdict} />
          )}
          {hasDecision && (
            <CheckCircle2 className="size-4 text-success" />
          )}
        </div>
      </div>

      {/* Running state */}
      {research.status === "running" && (
        <div className="flex items-center gap-2 py-6 text-text-muted">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Researching...</span>
        </div>
      )}

      {/* Failed */}
      {research.status === "failed" && (
        <div className="flex items-center gap-2 py-4 text-danger">
          <AlertCircle className="size-4" />
          <span className="text-sm">Research failed. Try again.</span>
        </div>
      )}

      {/* Complete — show brief fields per docs §5 */}
      {isComplete && brief && (
        <div className="flex flex-col gap-3">
          {brief.marketSignal && (
            <div>
              <h4 className="text-xs font-bold text-text-heading mb-0.5">Market signal</h4>
              <p className="text-sm text-text-primary leading-relaxed">{brief.marketSignal}</p>
            </div>
          )}

          {brief.painEvidence && (
            <div>
              <h4 className="text-xs font-bold text-text-heading mb-0.5">Pain evidence</h4>
              <p className="text-sm text-text-primary leading-relaxed">{brief.painEvidence}</p>
            </div>
          )}

          {brief.competition && (
            <div>
              <h4 className="text-xs font-bold text-text-heading mb-0.5">Competition</h4>
              <div className="flex items-center gap-2">
                <CompetitionBadge level={brief.competition} />
                {brief.competitionNote && (
                  <span className="text-xs text-text-secondary">{brief.competitionNote}</span>
                )}
              </div>
            </div>
          )}

          {brief.aiReason && (
            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs text-text-secondary italic">&ldquo;{brief.aiReason}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function ReviewContent({ problemId }: { problemId: string }) {
  const router = useRouter();
  const { researches, loading } = useResearches(problemId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-select if only one complete research with "pursue" verdict
  useEffect(() => {
    const completed = researches.filter((r) => r.status === "complete");
    if (completed.length === 1 && completed[0].brief?.aiVerdict === "pursue") {
      setSelectedId(completed[0].id);
    }
  }, [researches]);

  const handleSubmit = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/agents/gate-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId,
          researchId: selectedId,
          decision: {
            verdict: "pursue" as Verdict,
            reason: reason.trim() || undefined,
          },
        }),
      });

      if (res.ok) {
        router.push(`/workspace/idea/${problemId}`);
      }
    } catch (err) {
      console.error("Gate decision error:", err);
    }

    setSubmitting(false);
  }, [selectedId, reason, problemId, router]);

  const allComplete = researches.length > 0 && researches.every((r) => r.status === "complete");
  const alreadyDecided = researches.some((r) => r.founderDecision !== null);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Toolbar */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 rounded-lg hover:bg-input-bg md:hidden">
            <ArrowLeft className="size-5 text-text-heading" />
          </button>
          <span className="text-sm font-medium text-text-heading">Define Gate — Review Briefs</span>
        </div>
        {allComplete && !alreadyDecided && (
          <button
            onClick={handleSubmit}
            disabled={!selectedId || submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40"
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            {submitting ? "Saving..." : "Confirm Choice"}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-2xl font-bold text-text-heading mb-2">
          Which problem should we pursue?
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Review each research brief below. Select the one you want to build on. This decision unlocks the Develop stage.
        </p>

        {/* Brief cards */}
        <div className="flex flex-col gap-4 mb-8">
          {researches.map((r, i) => (
            <BriefCard
              key={r.id}
              research={r}
              index={i}
              selected={selectedId === r.id}
              onSelect={() => setSelectedId(r.id)}
              disabled={alreadyDecided}
            />
          ))}
        </div>

        {/* Reason input — only when selection made and not already decided */}
        {selectedId && !alreadyDecided && (
          <div className="mb-8">
            <label className="text-sm font-medium text-text-heading mb-2 block">
              Why this one? <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Biggest market gap, aligns with my experience…"
              className="w-full px-4 py-3 bg-input-bg rounded-xl text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Already decided notice */}
        {alreadyDecided && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-center gap-3">
            <CheckCircle2 className="size-5 text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Decision recorded</p>
              <p className="text-xs text-green-700">You&apos;ve already passed this gate. The Develop stage is unlocked.</p>
            </div>
          </div>
        )}

        {/* Mobile submit */}
        {allComplete && !alreadyDecided && selectedId && (
          <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-accent-primary text-white font-semibold shadow-lg active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
              {submitting ? "Saving..." : "Confirm Choice"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewBriefsPage() {
  const params = useParams();
  const problemId = params.id as string;

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden">
        <ReviewContent problemId={problemId} />
      </div>

      {/* Desktop */}
      <div className="hidden md:flex h-screen">
        <WorkspaceLayout>
          <ReviewContent problemId={problemId} />
        </WorkspaceLayout>
      </div>
    </>
  );
}

// Made with Bob
