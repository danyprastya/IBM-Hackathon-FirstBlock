"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkOnboardingAndRedirect = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.onboardingCompleted) {
          router.push("/workspace");
        } else {
          router.push("/onboarding");
        }
      } else {
        router.push("/onboarding");
      }
      router.refresh();
    } catch (err) {
      console.error("Error checking onboarding status:", err);
      router.push("/onboarding");
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      await signInWithGoogle();
      await new Promise((resolve) => setTimeout(resolve, 500));

      const currentUser = (await import("@/lib/firebase/client")).auth
        .currentUser;
      if (currentUser) {
        await checkOnboardingAndRedirect(currentUser.uid);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Illustration area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden px-8 pt-12">
        {/* Background circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-72 h-72 rounded-full border border-accent-primary/10" />
          <div className="absolute w-56 h-56 rounded-full border border-accent-primary/8" />
          <div className="absolute w-40 h-40 rounded-full border border-accent-primary/5" />
        </div>

        {/* Floating emoji bubbles */}
        <div className="relative w-full max-w-xs h-64">
          {/* Center folder with lightbulb */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-24 bg-accent-primary/10 rounded-xl flex items-end justify-center pb-2">
            <span className="text-3xl">💡</span>
          </div>

          {/* Floating emojis */}
          <div className="absolute top-0 left-1/3 w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shadow-sm animate-bounce-slow">
            <span className="text-xl">📝</span>
          </div>
          <div className="absolute top-4 right-4 w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center shadow-sm" style={{ animationDelay: "0.2s" }}>
            <span className="text-lg">🧠</span>
          </div>
          <div className="absolute top-16 left-0 w-11 h-11 bg-yellow-50 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-lg">⭐</span>
          </div>
          <div className="absolute bottom-8 left-0 w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-lg">🧩</span>
          </div>
          <div className="absolute top-0 left-0 w-9 h-9 bg-purple-50 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-sm">🚀</span>
          </div>
          <div className="absolute bottom-0 right-0 w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-lg">📦</span>
          </div>
        </div>
      </div>

      {/* Bottom content */}
      <div className="px-8 pb-12 space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 bg-text-heading rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-sm" />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase text-text-heading">
            First Block
          </span>
        </div>

        {/* Tagline */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-text-heading leading-tight">
            Every big thing started
            <br />
            as a raw idea
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed px-4">
            Dump your raw ideas, organize them your way, and let AI help you
            figure out if they&apos;re worth pursuing.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm text-center">
            {error}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-accent-primary text-white font-semibold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Made with Bob
