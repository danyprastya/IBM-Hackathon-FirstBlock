// SERVER-SIDE Firebase Admin SDK configuration
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

// Initialize Firebase Admin (singleton pattern)
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
} else {
  app = getApps()[0];
}

// Export Firebase Admin services
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export { app as adminApp };

// Made with Bob
