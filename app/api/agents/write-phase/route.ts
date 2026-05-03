// API route: Generate one development phase (v1, v2, vN, complete)
// POST /api/agents/write-phase

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { phaseWriteRequestSchema } from "@/lib/utils/validators";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const validation = phaseWriteRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      problemId, researchId, solutionCollectionId,
      solutionId, prdId, version,
    } = validation.data;

    // Verify PRD exists and is complete
    const prdRef = adminDb.doc(
      PATHS.prd(userId, problemId, researchId, solutionCollectionId, solutionId, prdId)
    );
    const prdDoc = await prdRef.get();

    if (!prdDoc.exists || prdDoc.data()?.status !== "complete") {
      return NextResponse.json(
        { error: "PRD not found or not complete" },
        { status: 400 }
      );
    }

    // Get existing phases for sequential context
    const phasesSnapshot = await adminDb
      .collection(
        PATHS.phases(userId, problemId, researchId, solutionCollectionId, solutionId, prdId)
      )
      .orderBy("order", "asc")
      .get();

    const existingPhases = phasesSnapshot.docs.map((d) => d.data());
    const nextOrder = existingPhases.length + 1;

    // Get founder profile + compacted context
    const [userDoc, scDoc] = await Promise.all([
      adminDb.doc(PATHS.user(userId)).get(),
      adminDb.doc(
        PATHS.solutionCollection(userId, problemId, researchId, solutionCollectionId)
      ).get(),
    ]);

    const founderProfile = userDoc.data()?.onboarding || null;
    const compactedContext = scDoc.data()?.compactedContext || "";
    const fullPrd = prdDoc.data()?.fullPrd || "";

    // Create phase doc
    const phaseRef = adminDb
      .collection(
        PATHS.phases(userId, problemId, researchId, solutionCollectionId, solutionId, prdId)
      )
      .doc();

    await phaseRef.set({
      id: phaseRef.id,
      version,
      order: nextOrder,
      content: "",
      createdAt: FieldValue.serverTimestamp(),
      status: "running",
    });

    // Run PhaseAgent (single phase — sequential is managed by caller)
    const results = await AgentRouter.writePhases(
      [version],
      fullPrd,
      compactedContext,
      founderProfile,
      userId
    );

    const result = results[0];

    if (!result.success) {
      await phaseRef.update({ status: "failed" });
      return NextResponse.json(
        { error: "Phase generation failed", detail: result.error },
        { status: 500 }
      );
    }

    await phaseRef.update({
      status: "complete",
      content: result.output,
    });

    return NextResponse.json({
      success: true,
      phaseId: phaseRef.id,
      version,
      order: nextOrder,
      content: result.output,
      metadata: result.metadata,
    });
  } catch (error) {
    const err = error as Error;
    console.error("POST /api/agents/write-phase error:", err.message);

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
