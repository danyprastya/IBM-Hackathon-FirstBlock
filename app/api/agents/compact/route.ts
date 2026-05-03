// API route: Context compaction between stages
// POST /api/agents/compact

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { compactRequestSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { AgentRouter } from "@/lib/agents/router";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth + CSRF
    const userId = await requireAuth(req);

    // 2. Validate input
    const body = await req.json();
    const validation = compactRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { upstreamOutput, stage } = validation.data;

    // 3. Sanitize
    const sanitizedOutput = sanitizeText(upstreamOutput, 50000);

    // 4. Run ContextCompactor agent
    const result = await AgentRouter.compact(sanitizedOutput, stage, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: "Context compaction failed", detail: result.error },
        { status: 500 }
      );
    }

    // 5. Return compacted context
    return NextResponse.json({
      success: true,
      compactedContext: result.output,
      metadata: result.metadata,
    });
  } catch (error) {
    const err = error as Error;
    console.error("POST /api/agents/compact error:", err.message);

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
