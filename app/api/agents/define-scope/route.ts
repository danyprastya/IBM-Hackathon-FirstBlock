// API route: Define MVP scope for chosen solution
// POST /api/agents/define-scope

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { scopeRequestSchema } from "@/lib/utils/validators";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { parseScope } from "@/lib/agents/parsers";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const validation = scopeRequestSchema.safeParse(body);

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

    // Create MVP doc with running status
    const mvpRef = adminDb
      .collection(
        PATHS.mvps(userId, problemId, researchId, solutionCollectionId, solutionId)
      )
      .doc();

    await mvpRef.set({
      id: mvpRef.id,
      createdAt: FieldValue.serverTimestamp(),
      status: "running",
      scopeIn: [],
      scopeOut: [],
      founderConfirmed: false,
      confirmedAt: null,
    });

    // Run ScopeAgent (just scope, not metrics — those run in parallel via separate route)
    const [scopeResult] = await AgentRouter.defineScopeAndMetrics(
      chosenSolution,
      chosenProblem,
      compactedContext,
      founderProfile,
      userId
    );
    // defineScopeAndMetrics returns [scopeResult, metricsResult]
    // This route only uses scopeResult (index 0)

    if (!scopeResult.success) {
      await mvpRef.update({ status: "failed" });
      return NextResponse.json(
        { error: "Scope definition failed", detail: scopeResult.error },
        { status: 500 }
      );
    }

    const parsed = parseScope(scopeResult.output);

    await mvpRef.update({
      status: "complete",
      scopeIn: parsed.scopeIn,
      scopeOut: parsed.scopeOut,
    });

    return NextResponse.json({
      success: true,
      mvpId: mvpRef.id,
      scopeIn: parsed.scopeIn,
      scopeOut: parsed.scopeOut,
      constraintNote: parsed.constraintNote,
      metadata: scopeResult.metadata,
    });
  } catch (error) {
    const err = error as Error;
    console.error("POST /api/agents/define-scope error:", err.message);

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
