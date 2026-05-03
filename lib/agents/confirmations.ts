// API route: Founder confirms/edits scope and metrics at Scope gate
// POST /api/agents/confirm-scope — confirm MVP scope
// POST /api/agents/confirm-metrics — confirm success metrics

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { mvpConfirmSchema, metricsConfirmSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";

// Shared path params validator
function extractPathParams(body: Record<string, unknown>) {
  const required = [
    "problemId",
    "researchId",
    "solutionCollectionId",
    "solutionId",
  ] as const;

  for (const key of required) {
    if (!body[key] || typeof body[key] !== "string") {
      return null;
    }
  }

  return {
    problemId: body.problemId as string,
    researchId: body.researchId as string,
    solutionCollectionId: body.solutionCollectionId as string,
    solutionId: body.solutionId as string,
  };
}

// ─── Confirm Scope ────────────────────────────────────────────────

export async function confirmScope(req: NextRequest) {
  const userId = await requireAuth(req);
  const body = await req.json();

  const params = extractPathParams(body);
  if (!params) {
    return NextResponse.json({ error: "Missing path params" }, { status: 400 });
  }

  const mvpId = body.mvpId;
  if (!mvpId || typeof mvpId !== "string") {
    return NextResponse.json({ error: "Missing mvpId" }, { status: 400 });
  }

  const validation = mvpConfirmSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validation.error.issues },
      { status: 400 }
    );
  }

  const mvpRef = adminDb.doc(
    PATHS.mvp(
      userId,
      params.problemId,
      params.researchId,
      params.solutionCollectionId,
      params.solutionId,
      mvpId
    )
  );

  const mvpDoc = await mvpRef.get();
  if (!mvpDoc.exists) {
    return NextResponse.json({ error: "MVP not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    founderConfirmed: validation.data.confirmed,
    confirmedAt: FieldValue.serverTimestamp(),
  };

  if (validation.data.edits) {
    updateData.founderEdits = sanitizeText(validation.data.edits, 1000);
  }

  await mvpRef.update(updateData);

  return NextResponse.json({ success: true, mvpId });
}

// ─── Confirm Metrics ──────────────────────────────────────────────

export async function confirmMetrics(req: NextRequest) {
  const userId = await requireAuth(req);
  const body = await req.json();

  const params = extractPathParams(body);
  if (!params) {
    return NextResponse.json({ error: "Missing path params" }, { status: 400 });
  }

  const metricsId = body.metricsId;
  if (!metricsId || typeof metricsId !== "string") {
    return NextResponse.json({ error: "Missing metricsId" }, { status: 400 });
  }

  const validation = metricsConfirmSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid input", details: validation.error.issues },
      { status: 400 }
    );
  }

  const smRef = adminDb.doc(
    PATHS.successMetric(
      userId,
      params.problemId,
      params.researchId,
      params.solutionCollectionId,
      params.solutionId,
      metricsId
    )
  );

  const smDoc = await smRef.get();
  if (!smDoc.exists) {
    return NextResponse.json({ error: "Metrics not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    founderConfirmed: validation.data.confirmed,
    confirmedAt: FieldValue.serverTimestamp(),
  };

  if (validation.data.edits) {
    // Sanitize each edit field
    const sanitizedEdits: Record<string, string> = {};
    for (const [key, val] of Object.entries(validation.data.edits)) {
      if (val) sanitizedEdits[key] = sanitizeText(val, 500);
    }
    updateData.founderEdits = sanitizedEdits;
  }

  await smRef.update(updateData);

  return NextResponse.json({ success: true, metricsId });
}

// Made with Bob
