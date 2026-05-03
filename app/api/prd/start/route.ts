// Thin route: kicks off prd-writer Trigger.dev task.
// Guards on founderConfirmed for both MVP and SuccessMetrics, then creates
// an empty PRD doc (status: "running") and fires the task.

import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { requireAuth } from "@/lib/utils/apiAuth";
import { prdWriteRequestSchema } from "@/lib/utils/validators";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";
import type { prdWriterTask } from "@/trigger/prd-writer";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const parsed = prdWriteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      problemId, researchId, solutionCollectionId,
      solutionId, mvpId, metricsId,
    } = parsed.data;

    const [mvpSnap, smSnap] = await Promise.all([
      adminDb.doc(
        PATHS.mvp(userId, problemId, researchId, solutionCollectionId, solutionId, mvpId)
      ).get(),
      adminDb.doc(
        PATHS.successMetric(
          userId, problemId, researchId, solutionCollectionId, solutionId, metricsId
        )
      ).get(),
    ]);

    if (!mvpSnap.exists || !mvpSnap.data()?.founderConfirmed) {
      return NextResponse.json(
        { error: "MVP scope not confirmed by founder" },
        { status: 400 }
      );
    }
    if (!smSnap.exists || !smSnap.data()?.founderConfirmed) {
      return NextResponse.json(
        { error: "Success metrics not confirmed by founder" },
        { status: 400 }
      );
    }

    const prdRef = adminDb
      .collection(
        PATHS.prds(userId, problemId, researchId, solutionCollectionId, solutionId)
      )
      .doc();

    await prdRef.set({
      id: prdRef.id,
      createdAt: FieldValue.serverTimestamp(),
      status: "running",
      fullPrd: "",
      mvpRef: mvpId,
      metricsRef: metricsId,
    });

    const handle = await tasks.trigger<typeof prdWriterTask>("prd-writer", {
      userId,
      problemId,
      researchId,
      solutionCollectionId,
      solutionId,
      mvpId,
      metricsId,
      prdId: prdRef.id,
    });

    return NextResponse.json({ prdId: prdRef.id, runId: handle.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized" || message === "Invalid origin - CSRF protection") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("POST /api/prd/start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Made with Bob
