"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import {
  SKILLS_OPTIONS,
  INTERESTS_OPTIONS,
  EXPERIENCE_OPTIONS,
  CAPITAL_OPTIONS,
  HOURS_OPTIONS,
} from "@/lib/data/content";

interface OnboardingData {
  location: string;
  experience: string;
  capital: string;
  skills: string[];
  interests: string[];
  hoursPerWeek: string;
  concern: string;
  goal: string;
}

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<OnboardingData>({
    location: "",
    experience: "",
    capital: "",
    skills: [],
    interests: [],
    hoursPerWeek: "",
    concern: "",
    goal: "",
  });

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const isValid = () => {
    switch (step) {
      case 1: return form.location.trim() !== "" && form.experience !== "";
      case 2: return form.capital !== "" && form.hoursPerWeek !== "";
      case 3: return form.skills.length > 0;
      case 4: return form.interests.length > 0;
      case 5: return form.concern.trim() !== "" && form.goal.trim() !== "";
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      router.push("/workspace");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Progress dots */}
      <div className="px-8 pt-12 pb-4">
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i < step
                  ? "w-8 bg-accent-primary"
                  : "w-6 bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-8 pb-32">
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        {/* ─── Step 1: About You ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-text-heading leading-tight">
                First, a little about you
              </h1>
              <p className="text-text-secondary text-sm mt-2">
                This helps us tailor ideas to your market and experience level.
              </p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-text-heading">
                Where are you based?
              </h2>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="City or country"
                className="w-full px-0 py-2 bg-transparent border-b border-gray-200 text-text-heading placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors text-base"
              />
            </div>

            {/* Experience — 2x2 card grid */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-text-heading">
                Where are you on your business journey?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, experience: opt.value })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      form.experience === opt.value
                        ? "bg-input-selected border-accent-primary"
                        : "bg-input-bg border-transparent"
                    }`}
                  >
                    <span className="text-2xl block mb-2">{opt.emoji}</span>
                    <span className="text-sm font-medium text-text-heading leading-snug">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Resources ─────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-text-heading leading-tight">
                What are you working with?
              </h1>
              <p className="text-text-secondary text-sm mt-2">
                No judgment here — great businesses have started with every budget and schedule.
              </p>
            </div>

            {/* Capital — 2x2 */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-text-heading">
                How much could you invest to get started?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {CAPITAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, capital: opt.value })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      form.capital === opt.value
                        ? "bg-input-selected border-accent-primary"
                        : "bg-input-bg border-transparent"
                    }`}
                  >
                    <span className="text-sm font-medium text-text-heading whitespace-pre-line leading-snug">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hours — 2x2 */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-text-heading">
                How much time can you put in each week?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {HOURS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, hoursPerWeek: opt.value })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      form.hoursPerWeek === opt.value
                        ? "bg-input-selected border-accent-primary"
                        : "bg-input-bg border-transparent"
                    }`}
                  >
                    <span className="text-sm font-medium text-text-heading whitespace-pre-line leading-snug">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 3: Skills ────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-text-heading leading-tight">
                What do you bring to the table?
              </h1>
              <p className="text-text-secondary text-sm mt-2">
                We&apos;ll suggest ideas that play to your strengths and match what excites you
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-base font-semibold text-text-heading">
                What are you good at? Pick all that fit
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {SKILLS_OPTIONS.map((skill) => (
                  <button
                    key={skill.label}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, skills: toggleItem(form.skills, skill.label) })
                    }
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      form.skills.includes(skill.label)
                        ? "bg-input-selected border-accent-primary"
                        : "bg-input-bg border-transparent"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{skill.emoji}</span>
                    <span className="text-xs font-medium text-text-heading leading-tight block">
                      {skill.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 4: Interests ─────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-text-heading leading-tight">
                What industries excite you?
                <br />
                Pick a few.
              </h1>
              <p className="text-text-secondary text-sm mt-2">
                Pick up to 5 that interest you most.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {INTERESTS_OPTIONS.map((interest) => (
                <button
                  key={interest.label}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      interests: toggleItem(form.interests, interest.label),
                    })
                  }
                  className={`px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all flex items-center gap-2 ${
                    form.interests.includes(interest.label)
                      ? "bg-input-selected border-accent-primary text-text-heading"
                      : "bg-white border-gray-200 text-text-heading"
                  }`}
                >
                  <span>{interest.emoji}</span>
                  {interest.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 5: Motivation ────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-text-heading leading-tight">
                One last thing — what&apos;s driving you?
              </h1>
              <p className="text-text-secondary text-sm mt-2">
                Be honest — this is just between you and your AI co-founder.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-text-heading">
                What&apos;s your biggest worry about starting?
              </h2>
              <textarea
                value={form.concern}
                onChange={(e) => setForm({ ...form, concern: e.target.value })}
                placeholder="e.g., I'm afraid I'll invest time and money into something nobody wants"
                rows={3}
                className="w-full px-0 py-2 bg-transparent border-b border-gray-200 text-text-heading placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors text-base resize-none"
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-text-heading">
                What does success look like a year from now?
              </h2>
              <textarea
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                placeholder="e.g., Have a running online store making $2K/month"
                rows={3}
                className="w-full px-0 py-2 bg-transparent border-b border-gray-200 text-text-heading placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-colors text-base resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-8 py-6 flex items-center gap-4">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="px-6 py-3.5 rounded-2xl border border-gray-200 text-text-heading font-semibold text-sm"
          >
            Back
          </button>
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!isValid()}
            className="flex-1 py-3.5 rounded-2xl bg-accent-primary text-white font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid() || loading}
            className="flex-1 py-3.5 rounded-2xl bg-accent-primary text-white font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Finish"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// Made with Bob
