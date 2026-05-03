// API route: Define success metrics for chosen solution
// POST /api/agents/define-metrics

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { metricsRequestSchema } from "@/lib/utils/validators";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { parseMetrics } from "@/lib/agents/parsers";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const validation = metricsRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { problemId, researchId, solutionCollectionId, solutionId } =
      validation.data;

    // Verify solution exists and is complete
    const solRef = adminDb.doc(
      PATHS.solution(
        userId, problemId, researchId, solutionCollectionId, solutionId
      )
    );
    const solDoc = await solRef.get();

    if (!solDoc.exists || solDoc.data()?.status !== "complete") {
      return NextResponse.json(
        { error: "Solution not found or not complete" },
        { status: 400 }
      );
    }

    // Get upstream data
    const [userDoc, problemDoc, scDoc] = await Promise.all([
      adminDb.doc(PATHS.user(userId)).get(),
      adminDb.doc(PATHS.problem(userId, problemId)).get(),
      adminDb.doc(
        PATHS.solutionCollection(userId, problemId, researchId, solutionCollectionId)
      ).get(),
    ]);

    const founderProfile = userDoc.data()?.onboarding || null;
    const chosenProblem = problemDoc.data()?.cleanedStatement || "";
    const chosenSolution = solDoc.data()?.direction || "";
    const compactedContext = scDoc.data()?.compactedContext || "";

    // Create successMetrics doc
    const smRef = adminDb
      .collection(
        PATHS.successMetrics(
          userId, problemId, researchId, solutionCollectionId, solutionId
        )
      )
      .doc();

    await smRef.set({
      id: smRef.id,
      createdAt: FieldValue.serverTimestamp(),
      status: "running",
      metrics: { adoption: "", value: "", business: "" },
      founderConfirmed: false,
      confirmedAt: null,
    });

    // Run MetricsAgent (index 1 from defineScopeAndMetrics)
    const results = await AgentRouter.defineScopeAndMetrics(
      chosenSolution,
      chosenProblem,
      compactedContext,
      founderProfile,
      userId
    );
    const metricsResult = results[1];

    if (!metricsResult.success) {
      await smRef.update({ status: "failed" });
      return NextResponse.json(
        { error: "Metrics definition failed", detail: metricsResult.error },
        { status: 500 }
      );
    }

    const parsed = parseMetrics(metricsResult.output);

    await smRef.update({
      status: "complete",
      metrics: {
        adoption: parsed.adoption,
        value: parsed.value,
        business: parsed.business,
      },
    });

    return NextResponse.json({
      success: true,
      metricsId: smRef.id,
      metrics: {
        adoption: parsed.adoption,
        value: parsed.value,
        business: parsed.business,
      },
      calibrationNote: parsed.calibrationNote,
      metadata: metricsResult.metadata,
    });
  } catch (error) {
    const err = error as Error;
    console.error("POST /api/agents/define-metrics error:", err.message);

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
