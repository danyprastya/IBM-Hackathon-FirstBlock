// API route: Founder gate decisions (pick problem / pick solution)
// POST /api/agents/gate-decision

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { gateDecisionRequestSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const validation = gateDecisionRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { problemId, researchId, solutionCollectionId, solutionId, decision } =
      validation.data;

    const founderDecision = {
      verdict: decision.verdict,
      reason: decision.reason ? sanitizeText(decision.reason, 500) : undefined,
      decidedAt: FieldValue.serverTimestamp(),
    };

    // Determine which gate based on provided IDs
    if (solutionId && solutionCollectionId && researchId) {
      // Develop gate — picking a solution
      const solRef = adminDb.doc(
        PATHS.solution(
          userId, problemId, researchId, solutionCollectionId, solutionId
        )
      );
      const solDoc = await solRef.get();

      if (!solDoc.exists) {
        return NextResponse.json({ error: "Solution not found" }, { status: 404 });
      }

      await solRef.update({ founderDecision });

      return NextResponse.json({
        success: true,
        gate: "develop",
        chosenId: solutionId,
      });
    } else if (researchId) {
      // Define gate — picking a problem (via research)
      const resRef = adminDb.doc(
        PATHS.research(userId, problemId, researchId)
      );
      const resDoc = await resRef.get();

      if (!resDoc.exists) {
        return NextResponse.json({ error: "Research not found" }, { status: 404 });
      }

      await resRef.update({ founderDecision });

      return NextResponse.json({
        success: true,
        gate: "define",
        chosenId: researchId,
      });
    } else {
      return NextResponse.json(
        { error: "Must provide researchId (Define gate) or solutionId (Develop gate)" },
        { status: 400 }
      );
    }
  } catch (error) {
    const err = error as Error;
    console.error("POST /api/agents/gate-decision error:", err.message);

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
