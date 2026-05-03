"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, Download, Sparkles } from "lucide-react";

// Mock idea data — will be replaced with Firestore fetch
const MOCK_IDEA = {
  title: "Meal Prep Delivery for College Dorms",
  folder: "Food & Bev",
  lastEdited: "Last edited 2 hours ago",
  content: `The Raw Dump (what the user originally typed)
so basically the idea is a meal prep delivery service but specifically for college students living in dorms. most dorm rooms dont have a real kitchen, just a microwave maybe a mini fridge. students eat like crap because cooking isnt an option and eating out every day is expensive.

what if there was a weekly subscription where you get 5 prepped meals delivered to your dorm every sunday night. healthy stuff, not sad salads — actual meals that you can heat up in a microwave in 3 minutes. price it around $45–55/week which is cheaper than eating out every day.

could partner with local kitchens or ghost kitchens near campus. start with one university, prove it works, then expand to others.

idk how delivery logistics would work inside dorms tho. like do you leave it at the front desk? do students pick up from a spot on campus? also not sure about food regulations for this kind of thing.`,
};

export default function IdeaDocumentPage() {
  const router = useRouter();
  const params = useParams();
  const [showResearchSheet, setShowResearchSheet] = useState(false);

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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResearchSheet(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading"
          >
            <Clock className="w-4 h-4" />
            Research Log
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-text-heading">
            <Download className="w-4 h-4" />
            Save
          </button>
        </div>
      </header>

      {/* Metadata badges */}
      <div className="px-6 pb-4 flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-input-bg text-xs font-medium text-text-secondary">
          {MOCK_IDEA.folder}
        </span>
        <span className="px-3 py-1 rounded-full bg-input-bg text-xs font-medium text-text-muted">
          {MOCK_IDEA.lastEdited}
        </span>
      </div>

      {/* Document content */}
      <div className="flex-1 px-6 pb-32">
        <h1 className="text-2xl font-bold text-text-heading leading-tight mb-6">
          {MOCK_IDEA.title}
        </h1>
        <div className="prose prose-sm max-w-none">
          {MOCK_IDEA.content.split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-base text-text-primary leading-relaxed mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Research with AI FAB */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <button className="flex items-center gap-2 px-8 py-4 rounded-full bg-accent-primary text-white font-semibold shadow-lg active:scale-[0.98] transition-transform">
          <Sparkles className="w-5 h-5" />
          Research with AI
        </button>
      </div>

      {/* Research results bottom sheet */}
      {showResearchSheet && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowResearchSheet(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[70vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="px-6 pb-8 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-text-heading">Research v1</h2>
                <span className="inline-block mt-1 px-2.5 py-1 bg-input-bg rounded-md text-xs text-text-muted">
                  2 hours ago
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-text-heading mb-1">
                    Market signal
                  </h3>
                  <p className="text-sm text-text-primary leading-relaxed">
                    Voice-first interfaces growing in adjacent verticals.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-text-heading mb-1">
                    Pain evidence
                  </h3>
                  <p className="text-sm text-text-primary leading-relaxed">
                    12 LinkedIn posts in last 30 days from solo founders saying they &apos;think out loud&apos;.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-text-heading mb-1">
                    Competition
                  </h3>
                  <p className="text-sm text-text-primary leading-relaxed">
                    white space — Voice + structured output is unclaimed for this audience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob
