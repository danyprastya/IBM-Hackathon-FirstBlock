import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { adminDb } from "@/lib/firebase/admin";

// GET - Fetch chat history for authenticated user
export async function GET(req: NextRequest) {
  try {
    // 1. Verify authentication
    const userId = await requireAuth(req);

    // 2. Query Firestore for user's messages (last 50)
    const messagesSnapshot = await adminDb
      .collection("messages")
      .where("userId", "==", userId)
      .orderBy("timestamp", "asc")
      .limit(50)
      .get();

    const messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/ai/messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Made with Bob
