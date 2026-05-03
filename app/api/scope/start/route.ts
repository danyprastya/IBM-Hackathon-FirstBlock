// Thin route: kicks off scope Trigger.dev task.
// Creates an empty MVP doc (status: "running") and fires the task.

import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { requireAuth } from "@/lib/utils/apiAuth";
import { scopeRequestSchema } from "@/lib/utils/validators";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";
import type { scopeTask } from "@/trigger/scope";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const parsed = scopeRequestSchema.safeParse(body);
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

    const handle = await tasks.trigger<typeof scopeTask>("scope", {
      userId,
      problemId,
      researchId,
      solutionCollectionId,
      solutionId,
      mvpId: mvpRef.id,
    });

    return NextResponse.json({ mvpId: mvpRef.id, runId: handle.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized" || message === "Invalid origin - CSRF protection") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("POST /api/scope/start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Made with Bob
