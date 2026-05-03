// API route: Founder gate decisions (pick problem / pick solution)
// POST /api/agents/gate-decision
// After saving decision, auto-triggers the next stage's agents.

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { gateDecisionRequestSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Fire-and-forget: trigger the next stage's agents via internal fetch.
 * Errors are logged but do not block the gate response.
 */
async function chainNextStage(
  baseUrl: string,
  cookie: string,
  endpoint: string,
  body: Record<string, string>
) {
  try {
    await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`Auto-chain ${endpoint} error:`, (err as Error).message);
  }
}

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

    // Derive base URL + cookie for internal chaining
    const origin = req.headers.get("origin") || req.nextUrl.origin;
    const cookie = req.headers.get("cookie") || "";

    // Determine which gate based on provided IDs
    if (solutionId && solutionCollectionId && researchId) {
      // ── Develop gate — picking a solution ──
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

      // Auto-chain → Scope stage (define-scope + define-metrics in parallel)
      if (decision.verdict === "pursue") {
        const chainBody = {
          problemId,
          researchId,
          solutionCollectionId,
          solutionId,
        };
        // Fire-and-forget: don't await — let them run async
        chainNextStage(origin, cookie, "/api/agents/define-scope", chainBody);
        chainNextStage(origin, cookie, "/api/agents/define-metrics", chainBody);
      }

      return NextResponse.json({
        success: true,
        gate: "develop",
        chosenId: solutionId,
        nextStage: decision.verdict === "pursue" ? "scope" : null,
      });
    } else if (researchId) {
      // ── Define gate — picking a problem (via research) ──
      const resRef = adminDb.doc(
        PATHS.research(userId, problemId, researchId)
      );
      const resDoc = await resRef.get();

      if (!resDoc.exists) {
        return NextResponse.json({ error: "Research not found" }, { status: 404 });
      }

      await resRef.update({ founderDecision });

      // Auto-chain → Develop stage (generate solutions)
      if (decision.verdict === "pursue") {
        chainNextStage(origin, cookie, "/api/agents/generate-solutions", {
          problemId,
          researchId,
        });
      }

      return NextResponse.json({
        success: true,
        gate: "define",
        chosenId: researchId,
        nextStage: decision.verdict === "pursue" ? "develop" : null,
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

