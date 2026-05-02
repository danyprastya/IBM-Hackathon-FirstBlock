"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, StickyNote, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { Button } from "@/components/ui/button";
import { APP_METADATA } from "@/lib/data/content";

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { userData, loading } = useUserData();

  const navigation = [
    { name: "Chat", href: "/workspace", icon: MessageSquare },
    { name: "Sticky Notes", href: "/workspace/sticky", icon: StickyNote },
    { name: "Profile", href: "/workspace/profile", icon: User },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <aside className="w-64 h-screen bg-bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/workspace" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
            <div className="w-5 h-5 rounded-lg bg-accent-primary" />
          </div>
          <span className="text-xl font-bold text-text-primary">
            {APP_METADATA.name}
          </span>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-6 border-b border-border">
        {loading ? (
          <div className="space-y-2">
            <div className="h-10 w-10 rounded-full bg-bg-secondary animate-pulse" />
            <div className="h-4 w-32 bg-bg-secondary rounded animate-pulse" />
            <div className="h-3 w-40 bg-bg-secondary rounded animate-pulse" />
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-accent-primary">
                {user?.displayName?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.displayName || "User"}
              </p>
              <p className="text-xs text-text-muted truncate">
                {user?.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Business Profile Summary */}
      {userData?.onboarding && (
        <div className="p-6 border-b border-border">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Your Profile
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-text-muted">Location:</span>{" "}
              <span className="text-text-primary">{userData.onboarding.location}</span>
            </div>
            <div>
              <span className="text-text-muted">Capital:</span>{" "}
              <span className="text-text-primary">{userData.onboarding.capital}</span>
            </div>
            <div>
              <span className="text-text-muted">Time:</span>{" "}
              <span className="text-text-primary">{userData.onboarding.hoursPerWeek}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-accent-primary/10 text-accent-primary border border-accent-primary/20"
                  : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}

// Made with Bob
