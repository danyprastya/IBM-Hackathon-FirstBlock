// API route: Problem CRUD for Discover stage
// POST /api/agents/problems — create problem
// GET /api/agents/problems — list user's problems

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, verifyAuthToken } from "@/lib/utils/apiAuth";
import { problemInputSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);

    const body = await req.json();
    const validation = problemInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { rawInput, inputType } = validation.data;
    const sanitizedInput = sanitizeText(rawInput, 2000);

    // Clean the statement — for now just trim. AI cleaning can be added later.
    const cleanedStatement = sanitizedInput
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);

    // Create problem doc
    const problemRef = adminDb
      .collection(PATHS.problems(userId))
      .doc();

    const problemData = {
      id: problemRef.id,
      rawInput: sanitizedInput,
      cleanedStatement,
      inputType,
      createdAt: FieldValue.serverTimestamp(),
    };

    await problemRef.set(problemData);

    return NextResponse.json({
      success: true,
      problem: {
        ...problemData,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("POST /api/agents/problems error:", err.message);

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

export async function GET() {
  try {
    const userId = await verifyAuthToken();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await adminDb
      .collection(PATHS.problems(userId))
      .orderBy("createdAt", "desc")
      .get();

    const problems = snapshot.docs.map((doc) => ({
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ problems });
  } catch (error) {
    const err = error as Error;
    console.error("GET /api/agents/problems error:", err.message);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Made with Bob
