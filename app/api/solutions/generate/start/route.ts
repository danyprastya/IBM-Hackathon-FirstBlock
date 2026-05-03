// Thin route: kicks off solution-generation Trigger.dev task.
// Creates an empty solutionCollection (status: "running") and fires the task.
// Task fills in solutionCount + writes one solution doc per direction.

import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { requireAuth } from "@/lib/utils/apiAuth";
import { solutionGenerateRequestSchema } from "@/lib/utils/validators";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";
import type { solutionGenerationTask } from "@/trigger/solution-generation";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const parsed = solutionGenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { problemId, researchId } = parsed.data;

    // Verify research is complete
    const researchSnap = await adminDb
      .doc(PATHS.research(userId, problemId, researchId))
      .get();
    if (!researchSnap.exists || researchSnap.data()?.status !== "complete") {
      return NextResponse.json(
        { error: "Research not complete" },
        { status: 400 }
      );
    }

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

    const handle = await tasks.trigger<typeof solutionGenerationTask>(
      "solution-generation",
      {
        userId,
        problemId,
        researchId,
        solutionCollectionId: scRef.id,
      }
    );

    return NextResponse.json({
      solutionCollectionId: scRef.id,
      runId: handle.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized" || message === "Invalid origin - CSRF protection") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("POST /api/solutions/generate/start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Made with Bob
