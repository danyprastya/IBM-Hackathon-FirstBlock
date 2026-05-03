// Thin route: kicks off solution-research Trigger.dev task for one solution.
// Marks the solution doc as running, then fires the task.
// Caller should fire one of these per solution (in parallel) after the
// solutionCollection is complete.

import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { requireAuth } from "@/lib/utils/apiAuth";
import { solutionResearchRequestSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import type { solutionResearchTask } from "@/trigger/solution-research";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const parsed = solutionResearchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      problemId, researchId,
      solutionCollectionId, solutionId, direction,
    } = parsed.data;

    const solRef = adminDb.doc(
      PATHS.solution(userId, problemId, researchId, solutionCollectionId, solutionId)
    );
    if (!(await solRef.get()).exists) {
      return NextResponse.json({ error: "Solution not found" }, { status: 404 });
    }

    await solRef.update({ status: "running" });

    const sanitizedDirection = sanitizeText(direction, 500);

    const handle = await tasks.trigger<typeof solutionResearchTask>(
      "solution-research",
      {
        userId,
        problemId,
        researchId,
        solutionCollectionId,
        solutionId,
        direction: sanitizedDirection,
      }
    );

    return NextResponse.json({ solutionId, runId: handle.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized" || message === "Invalid origin - CSRF protection") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("POST /api/solutions/research/start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Made with Bob
