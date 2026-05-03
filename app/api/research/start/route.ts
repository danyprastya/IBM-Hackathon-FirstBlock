import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { requireAuth } from "@/lib/utils/apiAuth";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { problemResearchRequestSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { checkRateLimit, incrementRateLimit } from "@/lib/utils/rateLimit";
import type { problemResearchTask } from "@/trigger/problem-research";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    if (await checkRateLimit(userId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in an hour." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = problemResearchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { problemId, problemStatement } = parsed.data;
    const safeStatement = sanitizeText(problemStatement, 2000);

    const problemSnap = await adminDb.doc(PATHS.problem(userId, problemId)).get();
    if (!problemSnap.exists) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const researchRef = adminDb.collection(PATHS.researches(userId, problemId)).doc();
    await researchRef.set({
      id: researchRef.id,
      createdAt: new Date(),
      status: "running",
      brief: {
        marketSignal: "",
        painEvidence: "",
        competition: "crowded",
        competitionNote: "",
        aiVerdict: "watch",
        aiReason: "",
      },
      founderDecision: null,
      compactedContext: "",
    });

    const handle = await tasks.trigger<typeof problemResearchTask>("problem-research", {
      userId,
      problemId,
      researchId: researchRef.id,
      problemStatement: safeStatement,
    });

    await incrementRateLimit(userId);

    return NextResponse.json({
      researchId: researchRef.id,
      runId: handle.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized" || message === "Invalid origin - CSRF protection") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("POST /api/research/start error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
