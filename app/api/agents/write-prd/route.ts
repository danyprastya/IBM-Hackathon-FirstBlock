// API route: Generate complete PRD from upstream context
// POST /api/agents/write-prd

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { prdWriteRequestSchema } from "@/lib/utils/validators";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const validation = prdWriteRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      problemId, researchId, solutionCollectionId,
      solutionId, mvpId, metricsId,
    } = validation.data;

    // Fetch all upstream docs in parallel
    const [
      problemDoc, researchDoc, solDoc, mvpDoc, smDoc, scDoc,
    ] = await Promise.all([
      adminDb.doc(PATHS.problem(userId, problemId)).get(),
      adminDb.doc(PATHS.research(userId, problemId, researchId)).get(),
      adminDb.doc(
        PATHS.solution(userId, problemId, researchId, solutionCollectionId, solutionId)
      ).get(),
      adminDb.doc(
        PATHS.mvp(userId, problemId, researchId, solutionCollectionId, solutionId, mvpId)
      ).get(),
      adminDb.doc(
        PATHS.successMetric(userId, problemId, researchId, solutionCollectionId, solutionId, metricsId)
      ).get(),
      adminDb.doc(
        PATHS.solutionCollection(userId, problemId, researchId, solutionCollectionId)
      ).get(),
    ]);

    // Verify all docs exist and are confirmed
    if (!mvpDoc.exists || !mvpDoc.data()?.founderConfirmed) {
      return NextResponse.json(
        { error: "MVP scope not confirmed by founder" },
        { status: 400 }
      );
    }
    if (!smDoc.exists || !smDoc.data()?.founderConfirmed) {
      return NextResponse.json(
        { error: "Success metrics not confirmed by founder" },
        { status: 400 }
      );
    }

    // Build input data from upstream docs
    const researchData = researchDoc.data();
    const solData = solDoc.data();
    const mvpData = mvpDoc.data();
    const smData = smDoc.data();
    const compactedContext = scDoc.data()?.compactedContext || "";

    const problemBrief = researchData?.brief
      ? `Problem: ${problemDoc.data()?.cleanedStatement}\nMarket signal: ${researchData.brief.marketSignal}\nPain evidence: ${researchData.brief.painEvidence}\nCompetition: ${researchData.brief.competition} — ${researchData.brief.competitionNote}\nVerdict: ${researchData.brief.aiVerdict}\nReason: ${researchData.brief.aiReason}`
      : "";

    const solutionBrief = solData?.brief
      ? `Solution: ${solData.direction}\nFeasibility: ${solData.brief.feasibility}\nDifferentiation: ${solData.brief.differentiation}\nFounder edge: ${solData.brief.founderEdge}\nVerdict: ${solData.brief.aiVerdict}\nReason: ${solData.brief.aiReason}`
      : "";

    // Create PRD doc
    const prdRef = adminDb
      .collection(
        PATHS.prds(userId, problemId, researchId, solutionCollectionId, solutionId)
      )
      .doc();

    await prdRef.set({
      id: prdRef.id,
      createdAt: FieldValue.serverTimestamp(),
      status: "running",
      fullPrd: "",
      mvpRef: mvpId,
      metricsRef: metricsId,
    });

    // Run PRDWriter agent
    const result = await AgentRouter.writePRD(
      problemBrief,
      solutionBrief,
      mvpData?.scopeIn || [],
      mvpData?.scopeOut || [],
      smData?.metrics || { adoption: "", value: "", business: "" },
      compactedContext,
      {
        mvp: mvpData?.founderEdits || undefined,
        metrics: smData?.founderEdits || undefined,
      },
      userId
    );

    if (!result.success) {
      await prdRef.update({ status: "failed" });
      return NextResponse.json(
        { error: "PRD generation failed", detail: result.error },
        { status: 500 }
      );
    }

    await prdRef.update({
      status: "complete",
      fullPrd: result.output,
    });

    return NextResponse.json({
      success: true,
      prdId: prdRef.id,
      fullPrd: result.output,
      metadata: result.metadata,
    });
  } catch (error) {
    const err = error as Error;
    console.error("POST /api/agents/write-prd error:", err.message);

    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message.includes("CSRF")) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Made with Bob
