"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle2, FileText, Download, Copy, Check } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { collection, query, orderBy, onSnapshot, Timestamp, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { PRDDocument, PhaseDocument } from "@/lib/firebase/collections";

function usePRDData(problemId: string) {
  const { user } = useAuth();
  const [prd, setPrd] = useState<PRDDocument | null>(null);
  const [phases, setPhases] = useState<PhaseDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !problemId) return;
    const base = `users/${user.uid}/problems/${problemId}`;

    const init = async () => {
      try {
        // Traverse to chosen solution's PRD
        const resSnap = await getDocs(query(collection(db, base, "researches"), orderBy("createdAt", "desc"), limit(1)));
        if (resSnap.empty) { setLoading(false); return; }
        const researchId = resSnap.docs[0].id;

        const scSnap = await getDocs(query(collection(db, base, "researches", researchId, "solutionCollections"), orderBy("createdAt", "desc"), limit(1)));
        if (scSnap.empty) { setLoading(false); return; }
        const scId = scSnap.docs[0].id;

        const solSnap = await getDocs(query(collection(db, base, "researches", researchId, "solutionCollections", scId, "solutions"), orderBy("createdAt", "desc")));
        const chosen = solSnap.docs.find((d) => d.data().founderDecision?.verdict === "pursue");
        if (!chosen) { setLoading(false); return; }
        const solutionId = chosen.id;

        // Listen to PRDs
        const prdPath = `${base}/researches/${researchId}/solutionCollections/${scId}/solutions/${solutionId}/prds`;
        const prdUnsub = onSnapshot(
          query(collection(db, prdPath), orderBy("createdAt", "desc"), limit(1)),
          (snap) => {
            if (!snap.empty) {
              const data = snap.docs[0].data();
              setPrd({
                id: snap.docs[0].id,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
                status: data.status || "running",
                fullPrd: data.fullPrd || "",
                mvpRef: data.mvpRef || "",
                metricsRef: data.metricsRef || "",
              });

              // Listen to phases
              const phasePath = `${prdPath}/${snap.docs[0].id}/phases`;
              const phaseUnsub = onSnapshot(
                query(collection(db, phasePath), orderBy("order", "asc")),
                (phaseSnap) => {
                  setPhases(
                    phaseSnap.docs.map((d) => {
                      const pData = d.data();
                      return {
                        id: d.id,
                        version: pData.version || "v1",
                        order: pData.order || 0,
                        content: pData.content || "",
                        createdAt: pData.createdAt instanceof Timestamp ? pData.createdAt.toDate() : new Date(),
                        status: pData.status || "running",
                      } as PhaseDocument;
                    })
                  );
                }
              );
              return () => phaseUnsub();
            }
            setLoading(false);
          }
        );

        return () => prdUnsub();
      } catch (err) {
        console.error("usePRDData error:", err);
        setLoading(false);
      }
    };

    init();
  }, [user?.uid, problemId]);

  return { prd, phases, loading };
}

function PRDContent({ problemId }: { problemId: string }) {
  const router = useRouter();
  const { prd, phases, loading } = usePRDData(problemId);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!prd?.fullPrd) return;
    navigator.clipboard.writeText(prd.fullPrd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (!prd) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <FileText className="size-10 text-text-muted mb-3" />
        <p className="text-sm font-medium text-text-heading mb-1">No PRD yet</p>
        <p className="text-xs text-text-muted">Complete the Scope gate first to generate your PRD.</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading hover:bg-input-bg transition-colors">
          Go Back
        </button>
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
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-accent-primary" />
            <span className="text-sm font-medium text-text-heading">Product Requirements Document</span>
          </div>
          {prd.status === "running" && <Loader2 className="size-4 text-accent-primary animate-spin" />}
          {prd.status === "complete" && <CheckCircle2 className="size-4 text-success" />}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} disabled={!prd.fullPrd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-heading hover:bg-input-bg transition-colors disabled:opacity-40">
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-text-heading hover:bg-input-bg transition-colors">
            <Download className="size-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* PRD Document */}
      <div className="max-w-2xl mx-auto px-6 md:px-8 py-10">
        {prd.status === "running" ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="size-8 text-accent-primary animate-spin" />
            <p className="text-sm font-medium text-text-heading">Generating your PRD...</p>
            <p className="text-xs text-text-muted">This may take a minute.</p>
          </div>
        ) : (
          <>
            {/* Full PRD rendered as markdown-like prose */}
            <div className="prose prose-sm max-w-none">
              {prd.fullPrd.split("\n").map((line, i) => {
                if (line.startsWith("# ")) {
                  return <h1 key={i} className="text-2xl font-bold text-text-heading mt-8 mb-4">{line.replace("# ", "")}</h1>;
                }
                if (line.startsWith("## ")) {
                  return <h2 key={i} className="text-lg font-bold text-text-heading mt-6 mb-3">{line.replace("## ", "")}</h2>;
                }
                if (line.startsWith("### ")) {
                  return <h3 key={i} className="text-base font-semibold text-text-heading mt-4 mb-2">{line.replace("### ", "")}</h3>;
                }
                if (line.startsWith("- ")) {
                  return <li key={i} className="text-sm text-text-primary ml-4 mb-1">{line.replace("- ", "")}</li>;
                }
                if (line.trim() === "") {
                  return <div key={i} className="h-3" />;
                }
                return <p key={i} className="text-sm text-text-primary leading-[1.8] mb-2">{line}</p>;
              })}
            </div>

            {/* Phases */}
            {phases.length > 0 && (
              <div className="mt-10 pt-8 border-t border-gray-200">
                <h2 className="text-lg font-bold text-text-heading mb-4 flex items-center gap-2">
                  📋 Implementation Phases
                </h2>
                <div className="flex flex-col gap-4">
                  {phases.map((phase) => (
                    <div key={phase.id} className="p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-text-heading">Phase {phase.order + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">{phase.version}</span>
                          {phase.status === "running" && <Loader2 className="size-3.5 text-accent-primary animate-spin" />}
                          {phase.status === "complete" && <CheckCircle2 className="size-3.5 text-success" />}
                        </div>
                      </div>
                      {phase.status === "running" ? (
                        <div className="flex items-center gap-2 py-2 text-text-muted">
                          <Loader2 className="size-3.5 animate-spin" />
                          <span className="text-xs">Writing...</span>
                        </div>
                      ) : (
                        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                          {phase.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PRDPage() {
  const params = useParams();
  const problemId = params.id as string;

  return (
    <>
      <div className="md:hidden"><PRDContent problemId={problemId} /></div>
      <div className="hidden md:flex h-screen">
        <WorkspaceLayout><PRDContent problemId={problemId} /></WorkspaceLayout>
      </div>
    </>
  );
}

// Made with Bob
