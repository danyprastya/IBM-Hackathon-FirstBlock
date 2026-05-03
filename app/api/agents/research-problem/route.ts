// API route: Problem research — parallel execution per problem
// POST /api/agents/research-problem

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { problemResearchRequestSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { parseProblemBrief } from "@/lib/agents/parsers";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth + CSRF
    const userId = await requireAuth(req);

    // 2. Validate
    const body = await req.json();
    const validation = problemResearchRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { problemId, problemStatement } = validation.data;

    // 3. Verify problem belongs to user
    const problemRef = adminDb.doc(PATHS.problem(userId, problemId));
    const problemDoc = await problemRef.get();

    if (!problemDoc.exists) {
      return NextResponse.json(
        { error: "Problem not found" },
        { status: 404 }
      );
    }

    // 4. Get founder profile
    const userDoc = await adminDb.doc(PATHS.user(userId)).get();
    const founderProfile = userDoc.data()?.onboarding || null;

    // 5. Create research doc with "running" status
    const researchRef = adminDb
      .collection(PATHS.researches(userId, problemId))
      .doc();

    await researchRef.set({
      id: researchRef.id,
      createdAt: FieldValue.serverTimestamp(),
      status: "running",
      brief: {
        marketSignal: "",
        painEvidence: "",
        competition: "white_space",
        competitionNote: "",
        aiVerdict: "watch",
        aiReason: "",
      },
      founderDecision: null,
      compactedContext: "",
    });

    // 6. Run ProblemResearch agent
    const sanitizedStatement = sanitizeText(problemStatement, 2000);

    const results = await AgentRouter.researchProblems(
      [{ id: problemId, cleanedStatement: sanitizedStatement }],
      founderProfile,
      undefined, // No upstream context for first research
      userId
    );

    const result = results[0];

    if (!result.success) {
      // Update status to failed
      await researchRef.update({ status: "failed" });
      return NextResponse.json(
        { error: "Research failed", detail: result.error },
        { status: 500 }
      );
    }

    // 7. Parse brief from output
    const brief = parseProblemBrief(result.output);

    // 8. Update research doc with results
    await researchRef.update({
      status: "complete",
      brief,
    });

    // 9. Return
    return NextResponse.json({
      success: true,
      researchId: researchRef.id,
      brief,
      metadata: result.metadata,
    });
  } catch (error) {
    const err = error as Error;
    console.error("POST /api/agents/research-problem error:", err.message);

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
