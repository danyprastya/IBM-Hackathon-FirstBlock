"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle2, Target, BarChart3, Pencil } from "lucide-react";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { collection, query, orderBy, onSnapshot, Timestamp, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { MVPDocument, SuccessMetricsDocument } from "@/lib/firebase/collections";

interface ScopeIds {
  researchId: string;
  scId: string;
  solutionId: string;
}

function useScopeData(problemId: string) {
  const { user } = useAuth();
  const [mvp, setMvp] = useState<MVPDocument | null>(null);
  const [metrics, setMetrics] = useState<SuccessMetricsDocument | null>(null);
  const [ids, setIds] = useState<ScopeIds | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !problemId) return;
    const base = `users/${user.uid}/problems/${problemId}`;

    // Traverse: research → solutionCollection → solution (with founderDecision) → mvps + metrics
    const init = async () => {
      try {
        const resSnap = await getDocs(query(collection(db, base, "researches"), orderBy("createdAt", "desc"), limit(1)));
        if (resSnap.empty) { setLoading(false); return; }
        const researchId = resSnap.docs[0].id;

        const scSnap = await getDocs(query(collection(db, base, "researches", researchId, "solutionCollections"), orderBy("createdAt", "desc"), limit(1)));
        if (scSnap.empty) { setLoading(false); return; }
        const scId = scSnap.docs[0].id;

        const solSnap = await getDocs(query(collection(db, base, "researches", researchId, "solutionCollections", scId, "solutions"), orderBy("createdAt", "desc")));
        // Find the chosen solution (has founderDecision with pursue)
        const chosen = solSnap.docs.find((d) => d.data().founderDecision?.verdict === "pursue");
        if (!chosen) { setLoading(false); return; }
        const solutionId = chosen.id;

        setIds({ researchId, scId, solutionId });

        // Listen to MVPs
        const mvpPath = `${base}/researches/${researchId}/solutionCollections/${scId}/solutions/${solutionId}/mvps`;
        const mvpUnsub = onSnapshot(
          query(collection(db, mvpPath), orderBy("createdAt", "desc"), limit(1)),
          (snap) => {
            if (!snap.empty) {
              const data = snap.docs[0].data();
              setMvp({
                id: snap.docs[0].id,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
                status: data.status || "running",
                scopeIn: data.scopeIn || [],
                scopeOut: data.scopeOut || [],
                founderConfirmed: data.founderConfirmed || false,
                founderEdits: data.founderEdits,
                confirmedAt: data.confirmedAt instanceof Timestamp ? data.confirmedAt.toDate() : null,
              });
            }
            setLoading(false);
          }
        );

        // Listen to Success Metrics
        const smPath = `${base}/researches/${researchId}/solutionCollections/${scId}/solutions/${solutionId}/successMetrics`;
        const smUnsub = onSnapshot(
          query(collection(db, smPath), orderBy("createdAt", "desc"), limit(1)),
          (snap) => {
            if (!snap.empty) {
              const data = snap.docs[0].data();
              setMetrics({
                id: snap.docs[0].id,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
                status: data.status || "running",
                metrics: data.metrics || { adoption: "", value: "", business: "" },
                founderConfirmed: data.founderConfirmed || false,
                founderEdits: data.founderEdits,
                confirmedAt: data.confirmedAt instanceof Timestamp ? data.confirmedAt.toDate() : null,
              });
            }
          }
        );

        return () => { mvpUnsub(); smUnsub(); };
      } catch (err) {
        console.error("useScopeData error:", err);
        setLoading(false);
      }
    };

    init();
  }, [user?.uid, problemId]);

  return { mvp, metrics, ids, loading };
}

function ScopeContent({ problemId }: { problemId: string }) {
  const router = useRouter();
  const { mvp, metrics, ids, loading } = useScopeData(problemId);
  const [confirming, setConfirming] = useState(false);

  const bothComplete = mvp?.status === "complete" && metrics?.status === "complete";
  const alreadyConfirmed = mvp?.founderConfirmed && metrics?.founderConfirmed;

  const handleConfirm = useCallback(async () => {
    if (!ids) return;
    setConfirming(true);
    // Confirm scope + metrics — no dedicated API yet, use gate-decision as scope gate
    // For now, navigate to idea page (PRD generation will be triggered separately)
    try {
      // In production, this would call a confirm-scope endpoint
      // For now, just navigate back
      router.push(`/workspace/idea/${problemId}`);
    } catch (err) {
      console.error(err);
    }
    setConfirming(false);
  }, [ids, problemId, router]);

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
          <span className="text-sm font-medium text-text-heading">Scope Gate — Confirm MVP</span>
        </div>
        {bothComplete && !alreadyConfirmed && (
          <button onClick={handleConfirm} disabled={confirming}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40">
            {confirming ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            {confirming ? "Confirming..." : "Confirm Scope"}
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 md:px-8 py-8">
        <h1 className="text-2xl font-bold text-text-heading mb-2">Review MVP Scope & Metrics</h1>
        <p className="text-sm text-text-secondary mb-8">
          Confirm what&apos;s in and out of your MVP, and validate success metrics before we generate the PRD.
        </p>

        {/* MVP Scope */}
        <div className="p-5 rounded-2xl border border-gray-200 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="size-5 text-accent-primary" />
            <h2 className="text-base font-bold text-text-heading">MVP Scope</h2>
            {mvp?.status === "running" && <Loader2 className="size-4 text-accent-primary animate-spin ml-auto" />}
            {mvp?.status === "complete" && <CheckCircle2 className="size-4 text-success ml-auto" />}
          </div>

          {!mvp || mvp.status === "running" ? (
            <div className="flex items-center gap-2 py-6 text-text-muted">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Defining scope...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-bold text-success mb-2 uppercase tracking-wider">✅ In scope</h3>
                <ul className="flex flex-col gap-1.5">
                  {mvp.scopeIn.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                      <CheckCircle2 className="size-4 text-success flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">❌ Out of scope</h3>
                <ul className="flex flex-col gap-1.5">
                  {mvp.scopeOut.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                      <span className="text-text-muted flex-shrink-0 mt-0.5">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Success Metrics */}
        <div className="p-5 rounded-2xl border border-gray-200 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="size-5 text-accent-primary" />
            <h2 className="text-base font-bold text-text-heading">Success Metrics</h2>
            {metrics?.status === "running" && <Loader2 className="size-4 text-accent-primary animate-spin ml-auto" />}
            {metrics?.status === "complete" && <CheckCircle2 className="size-4 text-success ml-auto" />}
          </div>

          {!metrics || metrics.status === "running" ? (
            <div className="flex items-center gap-2 py-6 text-text-muted">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Defining metrics...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {[
                { label: "Adoption", value: metrics.metrics.adoption, emoji: "👥" },
                { label: "Value", value: metrics.metrics.value, emoji: "💰" },
                { label: "Business", value: metrics.metrics.business, emoji: "📈" },
              ].map((m) => (
                <div key={m.label} className="p-3 bg-input-bg rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{m.emoji}</span>
                    <h4 className="text-xs font-bold text-text-heading">{m.label}</h4>
                  </div>
                  <p className="text-sm text-text-primary">{m.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {alreadyConfirmed && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-center gap-3">
            <CheckCircle2 className="size-5 text-success flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Scope confirmed</p>
              <p className="text-xs text-green-700">PRD generation is now unlocked.</p>
            </div>
          </div>
        )}

        {/* Mobile CTA */}
        {bothComplete && !alreadyConfirmed && (
          <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2">
            <button onClick={handleConfirm} disabled={confirming}
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-accent-primary text-white font-semibold shadow-lg active:scale-[0.98] transition-transform disabled:opacity-60">
              {confirming ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
              {confirming ? "Confirming..." : "Confirm Scope"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScopePage() {
  const params = useParams();
  const problemId = params.id as string;

  return (
    <>
      <div className="md:hidden"><ScopeContent problemId={problemId} /></div>
      <div className="hidden md:flex h-screen">
        <WorkspaceLayout><ScopeContent problemId={problemId} /></WorkspaceLayout>
      </div>
    </>
  );
}

// Made with Bob
