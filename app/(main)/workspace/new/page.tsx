"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Loader2, Download } from "lucide-react";

export default function NewIdeaPage() {
  const router = useRouter();
  const [ideaText, setIdeaText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!ideaText.trim()) return;
    setSaving(true);
    // TODO: save to Firestore via API
    // For now just redirect back
    setTimeout(() => {
      router.push("/workspace");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-text-heading" />
        </button>

        <button
          onClick={handleSave}
          disabled={saving || !ideaText.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          Save
        </button>
      </header>

      {/* Editor area */}
      <div className="flex-1 px-6 pb-32">
        <textarea
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          placeholder="What's the idea…"
          className="w-full h-32 bg-transparent text-2xl font-semibold text-text-heading placeholder:text-gray-300 focus:outline-none resize-none leading-relaxed"
        />
        <p className="text-sm text-text-muted -mt-2 mb-6">
          Describe it like you&apos;re texting a friend about it.
        </p>

        {/* Suggested section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-heading">Suggested</h3>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-text-heading">
            <span className="text-text-muted">↳</span>
            Use example problems
          </button>
        </div>
      </div>

      {/* Research with AI FAB */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <button
          disabled={!ideaText.trim()}
          className="flex items-center gap-2 px-8 py-4 rounded-full bg-accent-primary text-white font-semibold shadow-lg disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          <Sparkles className="w-5 h-5" />
          Research with AI
        </button>
      </div>
    </div>
  );
}

// Made with Bob
