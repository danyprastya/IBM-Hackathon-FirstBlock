"use client";

import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { StickyBoard } from "@/components/sticky/StickyBoard";

export default function StickyPage() {
  return (
    <WorkspaceLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <StickyBoard />
        </div>
      </div>
    </WorkspaceLayout>
  );
}

// Made with Bob
