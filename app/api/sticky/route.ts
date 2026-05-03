import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { adminDb } from "@/lib/firebase/admin";
import {
  stickyNoteSchema,
  stickyNoteUpdateSchema,
  stickyNoteDeleteSchema,
} from "@/lib/utils/validators";
import { sanitizeText, sanitizeColor } from "@/lib/utils/sanitize";

// GET - Fetch all sticky notes for the authenticated user
export async function GET(req: NextRequest) {
  try {
    // 1. Verify authentication
    const userId = await requireAuth(req);

    // 2. Query Firestore for user's stickies
    const stickiesSnapshot = await adminDb
      .collection("stickies")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const stickies = stickiesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ stickies });
  } catch (error) {
    console.error("GET /api/sticky error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new sticky note
export async function POST(req: NextRequest) {
  try {
    // 1. Verify authentication and CSRF
    const userId = await requireAuth(req);

    // 2. Parse and validate request body
    const body = await req.json();
    const validationResult = stickyNoteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 3. Sanitize inputs to prevent XSS
    const sanitizedContent = sanitizeText(data.content, 500);
    const sanitizedColor = sanitizeColor(data.color);

    // 4. Create sticky note in Firestore
    const stickyRef = adminDb.collection("stickies").doc();
    const now = new Date().toISOString();

    const stickyData = {
      userId,
      content: sanitizedContent,
      color: sanitizedColor,
      createdAt: now,
      updatedAt: now,
    };

    await stickyRef.set(stickyData);

    return NextResponse.json({
      success: true,
      sticky: { id: stickyRef.id, ...stickyData },
    });
  } catch (error) {
    console.error("POST /api/sticky error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing sticky note
export async function PUT(req: NextRequest) {
  try {
    // 1. Verify authentication and CSRF
    const userId = await requireAuth(req);

    // 2. Parse and validate request body
    const body = await req.json();
    const validationResult = stickyNoteUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 3. Check IDOR - verify sticky belongs to user
    const stickyRef = adminDb.collection("stickies").doc(data.id);
    const stickyDoc = await stickyRef.get();

    if (!stickyDoc.exists) {
      return NextResponse.json(
        { error: "Sticky note not found" },
        { status: 404 }
      );
    }

    const stickyData = stickyDoc.data();
    if (stickyData?.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden - not your sticky note" },
        { status: 403 }
      );
    }

    // 4. Sanitize inputs
    const updateData: Record<string, string> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.content !== undefined) {
      updateData.content = sanitizeText(data.content, 500);
    }

    if (data.color !== undefined) {
      updateData.color = sanitizeColor(data.color);
    }

    // 5. Update in Firestore
    await stickyRef.update(updateData);

    const updatedDoc = await stickyRef.get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      success: true,
      sticky: { id: stickyDoc.id, ...updatedData },
    });
  } catch (error) {
    console.error("PUT /api/sticky error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a sticky note
export async function DELETE(req: NextRequest) {
  try {
    // 1. Verify authentication and CSRF
    const userId = await requireAuth(req);

    // 2. Parse and validate request body
    const body = await req.json();
    const validationResult = stickyNoteDeleteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 3. Check IDOR - verify sticky belongs to user
    const stickyRef = adminDb.collection("stickies").doc(data.id);
    const stickyDoc = await stickyRef.get();

    if (!stickyDoc.exists) {
      return NextResponse.json(
        { error: "Sticky note not found" },
        { status: 404 }
      );
    }

    const stickyData = stickyDoc.data();
    if (stickyData?.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden - not your sticky note" },
        { status: 403 }
      );
    }

    // 4. Delete from Firestore
    await stickyRef.delete();

    return NextResponse.json({
      success: true,
      message: "Sticky note deleted",
    });
  } catch (error) {
    console.error("DELETE /api/sticky error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Made with Bob
