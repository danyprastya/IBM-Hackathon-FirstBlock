import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/apiAuth";
import { adminDb } from "@/lib/firebase/admin";
import { onboardingSchema } from "@/lib/utils/validators";
import { sanitizeText } from "@/lib/utils/sanitize";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authentication and CSRF
    const userId = await requireAuth(req);

    // 2. Parse and validate request body
    const body = await req.json();
    const validationResult = onboardingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 3. Sanitize all string inputs to prevent XSS
    const sanitizedData = {
      location: sanitizeText(data.location, 200),
      experience: data.experience,
      capital: data.capital,
      skills: data.skills,
      interests: data.interests,
      hoursPerWeek: data.hoursPerWeek,
      concern: sanitizeText(data.concern, 500),
      goal: sanitizeText(data.goal, 500),
    };

    // 4. Update user document in Firestore
    const userRef = adminDb.collection("users").doc(userId);
    
    await userRef.update({
      onboarding: sanitizedData,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Made with Bob
