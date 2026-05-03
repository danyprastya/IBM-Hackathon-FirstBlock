// Thin route: kicks off metrics Trigger.dev task.
// Creates an empty SuccessMetrics doc (status: "running") and fires the task.

import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { requireAuth } from "@/lib/utils/apiAuth";
import { metricsRequestSchema } from "@/lib/utils/validators";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";
import type { metricsTask } from "@/trigger/metrics";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const parsed = metricsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      problemId, researchId, solutionCollectionId, solutionId,
    } = parsed.data;

    const solSnap = await adminDb
      .doc(PATHS.solution(userId, problemId, researchId, solutionCollectionId, solutionId))
      .get();
    if (!solSnap.exists || solSnap.data()?.status !== "complete") {
      return NextResponse.json(
        { error: "Solution not complete" },
        { status: 400 }
      );
    }

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

    const handle = await tasks.trigger<typeof metricsTask>("metrics", {
      userId,
      problemId,
      researchId,
      solutionCollectionId,
      solutionId,
      metricsId: smRef.id,
    });

    return NextResponse.json({ metricsId: smRef.id, runId: handle.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized" || message === "Invalid origin - CSRF protection") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("POST /api/metrics/start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Made with Bob
