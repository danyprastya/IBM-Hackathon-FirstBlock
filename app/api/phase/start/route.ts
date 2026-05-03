// Thin route: kicks off phase Trigger.dev task for ONE version.
// Caller fires v1, waits, then fires v2 — task reads prior phases for context.

import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { requireAuth } from "@/lib/utils/apiAuth";
import { phaseWriteRequestSchema } from "@/lib/utils/validators";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";
import type { phaseTask } from "@/trigger/phase";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const parsed = phaseWriteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      problemId, researchId, solutionCollectionId,
      solutionId, prdId, version,
    } = parsed.data;

    const prdSnap = await adminDb
      .doc(
        PATHS.prd(userId, problemId, researchId, solutionCollectionId, solutionId, prdId)
      )
      .get();
    if (!prdSnap.exists || prdSnap.data()?.status !== "complete") {
      return NextResponse.json(
        { error: "PRD not complete" },
        { status: 400 }
      );
    }

    // Order = count of existing phases + 1
    const existingPhases = await adminDb
      .collection(
        PATHS.phases(userId, problemId, researchId, solutionCollectionId, solutionId, prdId)
      )
      .get();
    const nextOrder = existingPhases.size + 1;

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

    const handle = await tasks.trigger<typeof phaseTask>("phase", {
      userId,
      problemId,
      researchId,
      solutionCollectionId,
      solutionId,
      prdId,
      phaseId: phaseRef.id,
      version,
    });

    return NextResponse.json({
      phaseId: phaseRef.id,
      version,
      order: nextOrder,
      runId: handle.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized" || message === "Invalid origin - CSRF protection") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("POST /api/phase/start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Made with Bob
