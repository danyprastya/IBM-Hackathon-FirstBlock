// API route: Generate solution directions for a chosen problem
// POST /api/agents/generate-solutions

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { solutionGenerateRequestSchema } from "@/lib/utils/validators";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { parseSolutionDirections } from "@/lib/agents/parsers";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const validation = solutionGenerateRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { problemId, researchId } = validation.data;

    // Verify research exists and is complete
    const researchRef = adminDb.doc(
      PATHS.research(userId, problemId, researchId)
    );
    const researchDoc = await researchRef.get();

    if (!researchDoc.exists) {
      return NextResponse.json(
        { error: "Research not found" },
        { status: 404 }
      );
    }

    const researchData = researchDoc.data();
    if (researchData?.status !== "complete") {
      return NextResponse.json(
        { error: "Research not yet complete" },
        { status: 400 }
      );
    }

    // Get founder profile + problem statement
    const [userDoc, problemDoc] = await Promise.all([
      adminDb.doc(PATHS.user(userId)).get(),
      adminDb.doc(PATHS.problem(userId, problemId)).get(),
    ]);

    const founderProfile = userDoc.data()?.onboarding || null;
    const chosenProblem = problemDoc.data()?.cleanedStatement || "";
    const compactedContext = researchData?.compactedContext || "";

    // Create solutionCollection doc with "running" status
    const scRef = adminDb
      .collection(PATHS.solutionCollections(userId, problemId, researchId))
      .doc();

    await scRef.set({
      id: scRef.id,
      createdAt: FieldValue.serverTimestamp(),
      status: "running",
      solutionCount: 0,
      compactedContext: "",
    });

    // Run SolutionGenerator agent
    const result = await AgentRouter.generateSolutions(
      chosenProblem,
      compactedContext,
      founderProfile,
      userId
    );

    if (!result.success) {
      await scRef.update({ status: "failed" });
      return NextResponse.json(
        { error: "Solution generation failed", detail: result.error },
        { status: 500 }
      );
    }

    // Parse directions
    const parsed = parseSolutionDirections(result.output);

    // Create solution docs for each direction
    const solutionDocs = await Promise.all(
      parsed.directions.map(async (direction) => {
        const solRef = adminDb
          .collection(PATHS.solutions(userId, problemId, researchId, scRef.id))
          .doc();

        const solData = {
          id: solRef.id,
          direction,
          createdAt: FieldValue.serverTimestamp(),
          status: "pending" as const,
          brief: {
            feasibility: "",
            differentiation: "",
            founderEdge: "",
            aiVerdict: "watch" as const,
            aiReason: "",
          },
          founderDecision: null,
        };

        await solRef.set(solData);
        return { id: solRef.id, direction };
      })
    );

    // Update collection with count
    await scRef.update({
      status: "complete",
      solutionCount: parsed.count,
    });

    return NextResponse.json({
      success: true,
      solutionCollectionId: scRef.id,
      count: parsed.count,
      solutions: solutionDocs,
      metadata: result.metadata,
    });
  } catch (error) {
    const err = error as Error;
    console.error("POST /api/agents/generate-solutions error:", err.message);

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
