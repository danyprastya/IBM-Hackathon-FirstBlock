"use client";

import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { User, MapPin, DollarSign, Clock, Target, AlertCircle } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { userData, loading } = useUserData();

  if (loading) {
    return (
      <WorkspaceLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full border-4 border-accent-primary border-t-transparent animate-spin" />
            <p className="text-text-secondary">Loading profile...</p>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-text-primary">Your Profile</h1>
            <p className="text-text-secondary">
              View and manage your business profile information
            </p>
          </div>

          {/* Account Info */}
          <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-muted">Full Name</label>
                <p className="text-text-primary font-medium">
                  {user?.displayName || "Not set"}
                </p>
              </div>
              <div>
                <label className="text-sm text-text-muted">Email</label>
                <p className="text-text-primary font-medium">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Business Profile */}
          {userData?.onboarding && (
            <>
              <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-6">
                <h2 className="text-xl font-semibold text-text-primary">
                  Business Profile
                </h2>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-muted">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm font-medium">Location</span>
                    </div>
                    <p className="text-text-primary">
                      {userData.onboarding.location}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-muted">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Experience</span>
                    </div>
                    <p className="text-text-primary capitalize">
                      {userData.onboarding.experience === "never"
                        ? "Never started a business"
                        : userData.onboarding.experience === "tried"
                        ? "Have tried before"
                        : "Currently running a business"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-muted">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-medium">Starting Capital</span>
                    </div>
                    <p className="text-text-primary">{userData.onboarding.capital}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-muted">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Time Commitment</span>
                    </div>
                    <p className="text-text-primary">
                      {userData.onboarding.hoursPerWeek}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="text-sm font-medium">Skills</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userData.onboarding.skills?.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-text-muted">
                    <span className="text-sm font-medium">Interests</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userData.onboarding.interests?.map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-bg-secondary border border-border text-text-primary text-sm rounded-full"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Goals & Concerns */}
              <div className="bg-bg-card border border-border rounded-2xl p-6 space-y-6">
                <h2 className="text-xl font-semibold text-text-primary">
                  Goals & Concerns
                </h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-muted">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Main Concern</span>
                    </div>
                    <p className="text-text-primary leading-relaxed">
                      {userData.onboarding.concern}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-text-muted">
                      <Target className="w-4 h-4" />
                      <span className="text-sm font-medium">1-Year Goal</span>
                    </div>
                    <p className="text-text-primary leading-relaxed">
                      {userData.onboarding.goal}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}

// Made with Bob
