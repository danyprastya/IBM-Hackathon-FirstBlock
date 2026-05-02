// Rate limiting utilities for API routes
// Tracks rate limits in Firestore user documents

import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, UserDocument } from "@/lib/firebase/collections";

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_HOUR = 30;

/**
 * Check if user has exceeded rate limit
 * Returns true if rate limit exceeded, false otherwise
 */
export async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // User doesn't exist yet, allow request
      return false;
    }

    const userData = userDoc.data() as UserDocument;
    const now = Date.now();
    const windowStart = userData.rateLimit?.windowStart?.getTime() || 0;
    const count = userData.rateLimit?.count || 0;

    // Check if we're still in the same window
    if (now - windowStart < RATE_LIMIT_WINDOW) {
      // Still in the same window, check count
      if (count >= MAX_REQUESTS_PER_HOUR) {
        return true; // Rate limit exceeded
      }
    }

    return false; // Rate limit not exceeded
  } catch (error) {
    console.error("Rate limit check error:", error);
    // On error, allow the request (fail open)
    return false;
  }
}

/**
 * Increment rate limit counter for user
 * Resets counter if window has expired
 */
export async function incrementRateLimit(userId: string): Promise<void> {
  try {
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Initialize rate limit for new user
      await userRef.set(
        {
          rateLimit: {
            count: 1,
            windowStart: new Date(),
          },
        },
        { merge: true }
      );
      return;
    }

    const userData = userDoc.data() as UserDocument;
    const now = Date.now();
    const windowStart = userData.rateLimit?.windowStart?.getTime() || 0;
    const count = userData.rateLimit?.count || 0;

    // Check if we need to reset the window
    if (now - windowStart >= RATE_LIMIT_WINDOW) {
      // New window, reset counter
      await userRef.update({
        "rateLimit.count": 1,
        "rateLimit.windowStart": new Date(),
      });
    } else {
      // Same window, increment counter
      await userRef.update({
        "rateLimit.count": count + 1,
      });
    }
  } catch (error) {
    console.error("Rate limit increment error:", error);
    // Don't throw error, just log it
  }
}

/**
 * Get remaining requests for user in current window
 */
export async function getRemainingRequests(userId: string): Promise<number> {
  try {
    const userRef = adminDb.collection(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return MAX_REQUESTS_PER_HOUR;
    }

    const userData = userDoc.data() as UserDocument;
    const now = Date.now();
    const windowStart = userData.rateLimit?.windowStart?.getTime() || 0;
    const count = userData.rateLimit?.count || 0;

    // Check if window has expired
    if (now - windowStart >= RATE_LIMIT_WINDOW) {
      return MAX_REQUESTS_PER_HOUR;
    }

    return Math.max(0, MAX_REQUESTS_PER_HOUR - count);
  } catch (error) {
    console.error("Get remaining requests error:", error);
    return MAX_REQUESTS_PER_HOUR;
  }
}

// Made with Bob
