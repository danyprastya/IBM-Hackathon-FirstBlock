"use client";

import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";

export default function WorkspacePage() {
  return (
    <WorkspaceLayout>
      <div className="h-full flex">
        {/* Chat Panel - 60% */}
        <div className="w-[60%] h-full border-r border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <h1 className="text-2xl font-bold text-text-primary">AI Assistant</h1>
            <p className="text-sm text-text-secondary mt-1">
              Get personalized business advice and guidance
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                <div className="w-8 h-8 rounded-xl bg-accent-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  Welcome to FirstBlock
                </h2>
                <p className="text-text-secondary">
                  Chat functionality will be available soon. Start by exploring your sticky notes or updating your profile.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Notes Panel - 40% */}
        <div className="w-[40%] h-full flex flex-col">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-text-primary">Quick Notes</h2>
            <p className="text-sm text-text-secondary mt-1">
              Capture your ideas and insights
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                <div className="w-8 h-8 rounded-xl bg-accent-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  No notes yet
                </h3>
                <p className="text-text-secondary text-sm">
                  Sticky notes feature coming soon. You&apos;ll be able to create color-coded notes to organize your thoughts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
}

// Made with Bob
