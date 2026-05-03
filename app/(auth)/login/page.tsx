"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");



  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPasswordError("");
    setLoading(true);

    try {
      await signIn(email, password);
      router.push("/workspace");
      router.refresh();
    } catch (err) {
      const firebaseError = err as Error;
      const msg = firebaseError.message || "Failed to sign in";

      // Check if the error is password-related
      if (
        msg.includes("wrong-password") ||
        msg.includes("invalid-credential") ||
        msg.includes("invalid-login-credentials") ||
        msg.includes("INVALID_LOGIN_CREDENTIALS")
      ) {
        setPasswordError("Password salah. Silakan coba lagi.");
      } else if (
        msg.includes("user-not-found") ||
        msg.includes("USER_NOT_FOUND")
      ) {
        setError("Akun tidak ditemukan. Silakan daftar terlebih dahulu.");
      } else if (
        msg.includes("too-many-requests") ||
        msg.includes("TOO_MANY_ATTEMPTS")
      ) {
        setError("Terlalu banyak percobaan. Silakan coba lagi nanti.");
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setPasswordError("");
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push("/workspace");
      router.refresh();
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-white">
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Header */}
        <div className="text-center flex flex-col gap-2 items-center">
          <Link href="/" className="inline-block">
            <img
              src="/image/Logo2.png"
              alt="FirstBlock"
              className="size-12 mx-auto mb-4 object-contain"
            />
          </Link>
          <h1 className="text-3xl font-bold text-text-heading">
            Welcome back
          </h1>
          <p className="text-text-secondary">
            Sign in to continue building your ideas
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-border rounded-2xl p-8 flex flex-col gap-6">
          {/* General Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-text-heading">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2 bg-input-bg border border-input-border rounded-lg text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-text-heading">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="••••••••"
                  required
                  className={`w-full pl-10 pr-4 py-2 bg-input-bg border rounded-lg text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent ${
                    passwordError
                      ? "border-danger ring-1 ring-danger/30"
                      : "border-input-border"
                  }`}
                />
              </div>
              {/* Inline password error */}
              {passwordError && (
                <p className="text-xs text-danger flex items-center gap-1">
                  <svg className="size-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {passwordError}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-text-muted">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="size-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
        </div>

        {/* Register Link */}
        <p className="text-center text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-accent-primary hover:text-accent-hover font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

// Made with Bob
