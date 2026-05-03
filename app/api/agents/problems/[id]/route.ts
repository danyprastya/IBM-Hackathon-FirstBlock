// API route: PATCH and DELETE one problem.
// PATCH /api/agents/problems/:id  — founder rename of title and/or folder
// (rawInput is intentionally not editable — verbatim founder input is sacred)

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { problemUpdateSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { id: problemId } = await params;

    const body = await req.json();
    const validation = problemUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const ref = adminDb.doc(PATHS.problem(userId, problemId));
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const update: Record<string, string> = {};
    if (validation.data.title !== undefined) {
      update.title = sanitizeText(validation.data.title, 120);
    }
    if (validation.data.folder !== undefined) {
      update.folder = sanitizeText(validation.data.folder, 100);
    }

    await ref.update(update);

    return NextResponse.json({ success: true, problemId, ...update });
  } catch (error) {
    const err = error as Error;
    console.error("PATCH /api/agents/problems/[id] error:", err.message);

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
