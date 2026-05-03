"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { HighlightColor } from "@/hooks/useHighlights";
import { X, MessageSquarePlus } from "lucide-react";

const COLORS: { value: HighlightColor; bg: string; ring: string }[] = [
  { value: "yellow", bg: "bg-yellow-300", ring: "ring-yellow-400" },
  { value: "green",  bg: "bg-emerald-300", ring: "ring-emerald-400" },
  { value: "blue",   bg: "bg-sky-300", ring: "ring-sky-400" },
  { value: "pink",   bg: "bg-pink-300", ring: "ring-pink-400" },
];

interface HighlightToolbarProps {
  position: { top: number; left: number } | null;
  onSelect: (color: HighlightColor, note?: string) => void;
  onDismiss: () => void;
}

export function HighlightToolbar({
  position,
  onSelect,
  onDismiss,
}: HighlightToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [selectedColor, setSelectedColor] = useState<HighlightColor | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!position) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    // Slight delay to avoid immediately closing
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [position, onDismiss]);

  // Reset when hidden
  useEffect(() => {
    if (!position) {
      setShowNote(false);
      setNoteText("");
      setSelectedColor(null);
    }
  }, [position]);

  if (!position) return null;

  const handleColorClick = (color: HighlightColor) => {
    if (showNote) {
      setSelectedColor(color);
    } else {
      onSelect(color);
    }
  };

  const handleSubmitNote = () => {
    if (selectedColor) {
      onSelect(selectedColor, noteText.trim() || undefined);
    }
  };

  // Ensure toolbar stays within viewport
  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.max(8, position.top - 48),
    left: Math.max(8, Math.min(position.left, window.innerWidth - 220)),
    zIndex: 9999,
  };

  return createPortal(
    <div
      ref={ref}
      style={style}
      className="flex flex-col items-center gap-1 animate-in fade-in scale-in"
    >
      {/* Color picker row */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white rounded-xl shadow-lg border border-gray-200">
        {COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => handleColorClick(c.value)}
            className={`size-6 rounded-full ${c.bg} hover:scale-110 transition-transform ${
              selectedColor === c.value ? `ring-2 ${c.ring} ring-offset-1` : ""
            }`}
            title={c.value}
          />
        ))}

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <button
          onClick={() => setShowNote(!showNote)}
          className={`p-1 rounded-md transition-colors ${
            showNote ? "bg-accent-soft text-accent-primary" : "hover:bg-gray-100 text-text-muted"
          }`}
          title="Add note"
        >
          <MessageSquarePlus className="size-3.5" />
        </button>

        <button
          onClick={onDismiss}
          className="p-1 rounded-md hover:bg-gray-100 text-text-muted"
          title="Cancel"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Optional note input */}
      {showNote && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded-xl shadow-lg border border-gray-200 w-52">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 text-xs bg-transparent focus:outline-none text-text-heading placeholder:text-text-muted"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && selectedColor) handleSubmitNote();
              if (e.key === "Escape") onDismiss();
            }}
          />
          {selectedColor && (
            <button
              onClick={handleSubmitNote}
              className="px-2 py-0.5 bg-accent-primary text-white text-xs rounded-md font-medium hover:bg-accent-hover transition-colors"
            >
              Save
            </button>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

// Made with Bob
