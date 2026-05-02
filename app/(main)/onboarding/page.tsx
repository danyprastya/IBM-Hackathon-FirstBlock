"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
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

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<OnboardingData>({
    location: "",
    experience: "",
    capital: "",
    skills: [],
    interests: [],
    hoursPerWeek: "",
    concern: "",
    goal: "",
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    }
    return [...array, item];
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save onboarding data");
      }

      router.push("/workspace");
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.location.trim() && formData.experience;
      case 2:
        return formData.capital && formData.hoursPerWeek;
      case 3:
        return formData.skills.length > 0 && formData.interests.length > 0;
      case 4:
        return formData.concern.trim() && formData.goal.trim();
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-text-primary">
            Let&apos;s get to know you
          </h1>
          <p className="text-text-secondary">
            Help us personalize your FirstBlock experience
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-bg-card border border-border rounded-2xl p-8 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Background */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Your Background
                </h2>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  Where are you located? (City, Country)
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="e.g., Jakarta, Indonesia"
                  className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  Business experience
                </label>
                <div className="space-y-2">
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-3 bg-bg-secondary border border-border rounded-lg cursor-pointer hover:border-accent-primary transition-colors"
                    >
                      <input
                        type="radio"
                        name="experience"
                        value={option.value}
                        checked={formData.experience === option.value}
                        onChange={(e) =>
                          setFormData({ ...formData, experience: e.target.value })
                        }
                        className="w-4 h-4 text-accent-primary"
                      />
                      <span className="text-text-primary">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Resources */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Your Resources
                </h2>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  Starting capital available
                </label>
                <div className="space-y-2">
                  {CAPITAL_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-3 bg-bg-secondary border border-border rounded-lg cursor-pointer hover:border-accent-primary transition-colors"
                    >
                      <input
                        type="radio"
                        name="capital"
                        value={option.value}
                        checked={formData.capital === option.value}
                        onChange={(e) =>
                          setFormData({ ...formData, capital: e.target.value })
                        }
                        className="w-4 h-4 text-accent-primary"
                      />
                      <span className="text-text-primary">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  Time you can commit per week
                </label>
                <div className="space-y-2">
                  {HOURS_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 p-3 bg-bg-secondary border border-border rounded-lg cursor-pointer hover:border-accent-primary transition-colors"
                    >
                      <input
                        type="radio"
                        name="hoursPerWeek"
                        value={option.value}
                        checked={formData.hoursPerWeek === option.value}
                        onChange={(e) =>
                          setFormData({ ...formData, hoursPerWeek: e.target.value })
                        }
                        className="w-4 h-4 text-accent-primary"
                      />
                      <span className="text-text-primary">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Skills & Interests */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Skills & Interests
                </h2>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  Your skills (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILLS_OPTIONS.map((skill) => (
                    <label
                      key={skill}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.skills.includes(skill)
                          ? "bg-accent-primary/10 border-accent-primary"
                          : "bg-bg-secondary border-border hover:border-accent-primary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.skills.includes(skill)}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            skills: toggleArrayItem(formData.skills, skill),
                          })
                        }
                        className="w-4 h-4 text-accent-primary"
                      />
                      <span className="text-sm text-text-primary">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  Areas of interest (select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERESTS_OPTIONS.map((interest) => (
                    <label
                      key={interest}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.interests.includes(interest)
                          ? "bg-accent-primary/10 border-accent-primary"
                          : "bg-bg-secondary border-border hover:border-accent-primary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.interests.includes(interest)}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            interests: toggleArrayItem(formData.interests, interest),
                          })
                        }
                        className="w-4 h-4 text-accent-primary"
                      />
                      <span className="text-sm text-text-primary">{interest}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Goals & Concerns */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Your Goals
                </h2>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  What&apos;s your biggest concern about starting a business?
                </label>
                <textarea
                  value={formData.concern}
                  onChange={(e) =>
                    setFormData({ ...formData, concern: e.target.value })
                  }
                  placeholder="e.g., Not sure if my idea will work, worried about funding..."
                  rows={3}
                  className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  What do you want to achieve in the next year?
                </label>
                <textarea
                  value={formData.goal}
                  onChange={(e) =>
                    setFormData({ ...formData, goal: e.target.value })
                  }
                  placeholder="e.g., Launch my first product, generate side income..."
                  rows={3}
                  className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!isStepValid() || loading}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!isStepValid() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
