"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, ThumbsUp, Eye, ThumbsDown, Zap } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { collection, query, orderBy, onSnapshot, Timestamp, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { SolutionDocument, Verdict } from "@/lib/firebase/collections";

/** Finds the latest researchId + solutionCollectionId for a problem */
function useSolutions(problemId: string) {
  const { user } = useAuth();
  const [solutions, setSolutions] = useState<SolutionDocument[]>([]);
  const [pathIds, setPathIds] = useState<{ researchId: string; scId: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !problemId) return;

    const basePath = `users/${user.uid}/problems/${problemId}`;

    // Get latest research → latest solutionCollection → solutions
    const resQ = query(collection(db, basePath, "researches"), orderBy("createdAt", "desc"), limit(1));

    const unsub = onSnapshot(resQ, async (resSnap) => {
      if (resSnap.empty) { setLoading(false); return; }
      const researchId = resSnap.docs[0].id;

      const scQ = query(
        collection(db, basePath, "researches", researchId, "solutionCollections"),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const scSnap = await getDocs(scQ);
      if (scSnap.empty) { setLoading(false); return; }
      const scId = scSnap.docs[0].id;

      setPathIds({ researchId, scId });

      // Listen to solutions
      const solQ = query(
        collection(db, basePath, "researches", researchId, "solutionCollections", scId, "solutions"),
        orderBy("createdAt", "desc")
      );

      const solUnsub = onSnapshot(solQ, (solSnap) => {
        setSolutions(
          solSnap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              direction: data.direction || "",
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
              status: data.status || "running",
              brief: data.brief || {},
              founderDecision: data.founderDecision || null,
            } as SolutionDocument;
          })
        );
        setLoading(false);
      });

      return () => solUnsub();
    });

    return () => unsub();
  }, [user?.uid, problemId]);

  return { solutions, pathIds, loading };
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const config = {
    pursue: { bg: "bg-green-50", text: "text-green-800", icon: ThumbsUp, label: "Build" },
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

interface SolutionCardProps {
  solution: SolutionDocument;
  index: number;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function SolutionCard({ solution, index, selected, onSelect, disabled }: SolutionCardProps) {
  const brief = solution.brief;
  const isComplete = solution.status === "complete";
  const hasDecision = solution.founderDecision !== null;

  return (
    <button
      onClick={onSelect}
      disabled={disabled || !isComplete}
      className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
        selected ? "border-accent-primary bg-accent-soft"
        : hasDecision ? "border-green-300 bg-green-50/50"
        : "border-gray-200 hover:border-gray-300"
      } ${disabled && !selected ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-accent-primary" />
          <span className="text-sm font-bold text-text-heading">Solution #{index + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          {solution.status === "running" && <Loader2 className="size-4 text-accent-primary animate-spin" />}
          {isComplete && brief?.aiVerdict && <VerdictBadge verdict={brief.aiVerdict} />}
          {hasDecision && <CheckCircle2 className="size-4 text-success" />}
        </div>
      </div>

      {/* Direction label */}
      <p className="text-sm font-medium text-text-heading mb-3 bg-input-bg px-3 py-2 rounded-lg">{solution.direction}</p>

      {solution.status === "running" && (
        <div className="flex items-center gap-2 py-4 text-text-muted">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Researching solution...</span>
        </div>
      )}

      {solution.status === "failed" && (
        <div className="flex items-center gap-2 py-4 text-danger">
          <AlertCircle className="size-4" />
          <span className="text-sm">Research failed</span>
        </div>
      )}

      {isComplete && brief && (
        <div className="flex flex-col gap-3">
          {brief.feasibility && (
            <div>
              <h4 className="text-xs font-bold text-text-heading mb-0.5">Feasibility</h4>
              <p className="text-sm text-text-primary leading-relaxed">{brief.feasibility}</p>
            </div>
          )}
          {brief.differentiation && (
            <div>
              <h4 className="text-xs font-bold text-text-heading mb-0.5">Differentiation</h4>
              <p className="text-sm text-text-primary leading-relaxed">{brief.differentiation}</p>
            </div>
          )}
          {brief.founderEdge && (
            <div>
              <h4 className="text-xs font-bold text-text-heading mb-0.5">Founder Edge</h4>
              <p className="text-sm text-text-primary leading-relaxed">{brief.founderEdge}</p>
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

function SolutionsContent({ problemId }: { problemId: string }) {
  const router = useRouter();
  const { solutions, pathIds, loading } = useSolutions(problemId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allComplete = solutions.length > 0 && solutions.every((s) => s.status === "complete");
  const alreadyDecided = solutions.some((s) => s.founderDecision !== null);

  const handleSubmit = useCallback(async () => {
    if (!selectedId || !pathIds) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/agents/gate-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId,
          researchId: pathIds.researchId,
          solutionCollectionId: pathIds.scId,
          solutionId: selectedId,
          decision: {
            verdict: "pursue" as Verdict,
            reason: reason.trim() || undefined,
          },
        }),
      });
      if (res.ok) router.push(`/workspace/idea/${problemId}`);
    } catch (err) {
      console.error("Gate decision error:", err);
    }
    setSubmitting(false);
  }, [selectedId, pathIds, reason, problemId, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 rounded-lg hover:bg-input-bg md:hidden">
            <ArrowLeft className="size-5 text-text-heading" />
          </button>
          <span className="text-sm font-medium text-text-heading">Develop Gate — Pick a Solution</span>
        </div>
        {allComplete && !alreadyDecided && (
          <button onClick={handleSubmit} disabled={!selectedId || submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40">
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            {submitting ? "Saving..." : "Confirm Choice"}
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-2xl font-bold text-text-heading mb-2">Which solution should we build?</h1>
        <p className="text-sm text-text-secondary mb-8">
          Each direction was researched for feasibility, differentiation, and founder edge. Pick the one you want to scope into an MVP.
        </p>

        <div className="flex flex-col gap-4 mb-8">
          {solutions.map((s, i) => (
            <SolutionCard key={s.id} solution={s} index={i} selected={selectedId === s.id} onSelect={() => setSelectedId(s.id)} disabled={alreadyDecided} />
          ))}
        </div>

        {selectedId && !alreadyDecided && (
          <div className="mb-8">
            <label className="text-sm font-medium text-text-heading mb-2 block">
              Why this one? <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Most differentiated, fastest to market…"
              className="w-full px-4 py-3 bg-input-bg rounded-xl text-sm text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none" rows={3} />
          </div>
        )}

        {alreadyDecided && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-center gap-3">
            <CheckCircle2 className="size-5 text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Decision recorded</p>
              <p className="text-xs text-green-700">Scope stage is now unlocked.</p>
            </div>
          </div>
        )}

        {allComplete && !alreadyDecided && selectedId && (
          <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2">
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-accent-primary text-white font-semibold shadow-lg active:scale-[0.98] transition-transform disabled:opacity-60">
              {submitting ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
              {submitting ? "Saving..." : "Confirm Choice"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SolutionReviewPage() {
  const params = useParams();
  const problemId = params.id as string;

  return (
    <>
      <div className="md:hidden"><SolutionsContent problemId={problemId} /></div>
      <div className="hidden md:flex h-screen">
        <WorkspaceLayout><SolutionsContent problemId={problemId} /></WorkspaceLayout>
      </div>
    </>
  );
}

// Made with Bob
