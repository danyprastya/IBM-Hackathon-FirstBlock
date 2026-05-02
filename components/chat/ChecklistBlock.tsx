"use client";

import { ListChecks } from "lucide-react";

interface ChecklistBlockProps {
  items: string[];
}

export function ChecklistBlock({ items }: ChecklistBlockProps) {
  return (
    <div className="my-4 p-4 bg-accent-primary/5 border border-accent-primary/20 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="w-5 h-5 text-accent-primary" />
        <h3 className="font-semibold text-text-primary">Action Checklist</h3>
      </div>
      <ol className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3 text-sm text-text-primary">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-xs font-semibold text-accent-primary">
              {index + 1}
            </span>
            <span className="flex-1 leading-relaxed">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Made with Bob
