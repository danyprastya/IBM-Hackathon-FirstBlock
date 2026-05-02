// Firestore collection names and TypeScript interfaces
// This replaces MongoDB models with Firestore structure

export const COLLECTIONS = {
  USERS: "users",
  MESSAGES: "messages",
  STICKIES: "stickies",
} as const;

// User document structure (replaces User.ts model)
export interface UserDocument {
  uid: string; // Firebase Auth UID
  email: string;
  name?: string;
  onboardingCompleted: boolean;
  onboarding?: {
    location?: string;
    experience?: "never" | "tried" | "running";
    capital?: "<500" | "500-2000" | "2000-10000" | "10000+";
    skills?: string[];
    interests?: string[];
    hoursPerWeek?: "<10" | "10-20" | "20-40" | "fulltime";
    concern?: string;
    goal?: string;
  };
  project?: {
    businessName?: string;
    status: string;
    createdAt: Date;
  };
  rateLimit: {
    count: number;
    windowStart: Date;
  };
  createdAt: Date;
}

// Message document structure (replaces Message.ts model)
export interface MessageDocument {
  userId: string; // Firebase Auth UID
  role: "user" | "assistant";
  content: string;
  checklistItems?: string[];
  timestamp: Date;
}

// Sticky note document structure (replaces Sticky.ts model)
export interface StickyDocument {
  userId: string; // Firebase Auth UID
  content: string;
  color: string; // hex color
  createdAt: Date;
  updatedAt: Date;
}

// Made with Bob
