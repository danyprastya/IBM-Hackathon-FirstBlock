// API route: Research one solution direction
// POST /api/agents/research-solution

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { solutionResearchRequestSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { parseSolutionBrief } from "@/lib/agents/parsers";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const validation = solutionResearchRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      problemId,
      researchId,
      solutionCollectionId,
      solutionId,
      direction,
    } = validation.data;

    // Verify solution doc exists
    const solRef = adminDb.doc(
      PATHS.solution(
        userId,
        problemId,
        researchId,
        solutionCollectionId,
        solutionId
      )
    );
    const solDoc = await solRef.get();

    if (!solDoc.exists) {
      return NextResponse.json(
        { error: "Solution not found" },
        { status: 404 }
      );
    }

    // Get upstream context
    const [userDoc, problemDoc, scDoc] = await Promise.all([
      adminDb.doc(PATHS.user(userId)).get(),
      adminDb.doc(PATHS.problem(userId, problemId)).get(),
      adminDb.doc(
        PATHS.solutionCollection(
          userId,
          problemId,
          researchId,
          solutionCollectionId
        )
      ).get(),
    ]);

    const founderProfile = userDoc.data()?.onboarding || null;
    const chosenProblem = problemDoc.data()?.cleanedStatement || "";
    const compactedContext = scDoc.data()?.compactedContext || "";

    // Mark as running
    await solRef.update({ status: "running" });

    // Run SolutionResearch agent
    const sanitizedDirection = sanitizeText(direction, 500);

    const results = await AgentRouter.researchSolutions(
      [{ id: solutionId, direction: sanitizedDirection }],
      chosenProblem,
      compactedContext,
      founderProfile,
      userId
    );

    const result = results[0];

    if (!result.success) {
      await solRef.update({ status: "failed" });
      return NextResponse.json(
        { error: "Solution research failed", detail: result.error },
        { status: 500 }
      );
    }

    // Parse brief
    const brief = parseSolutionBrief(result.output);

    // Update solution doc
    await solRef.update({
      status: "complete",
      brief,
    });

    return NextResponse.json({
      success: true,
      solutionId,
      brief,
      metadata: result.metadata,
    });
  } catch (error) {
    const err = error as Error;
    console.error("POST /api/agents/research-solution error:", err.message);

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
