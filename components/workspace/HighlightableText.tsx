"use client";

import { useCallback, useRef, useState, useMemo, Fragment } from "react";
import { HighlightToolbar } from "./HighlightToolbar";
import type { Highlight, HighlightColor } from "@/hooks/useHighlights";
import { Trash2 } from "lucide-react";

// ─── Color map ────────────────────────────────────────────────────
const BG: Record<HighlightColor, string> = {
  yellow: "bg-yellow-200/60",
  green: "bg-emerald-200/60",
  blue: "bg-sky-200/60",
  pink: "bg-pink-200/60",
};

// ─── Props ────────────────────────────────────────────────────────

interface HighlightableTextProps {
  /** The raw text to render. */
  text: string;
  /** Unique field key (e.g. "marketSignal", "fullPrd") — used to scope highlights. */
  field: string;
  /** Existing highlights that match this field. */
  highlights: Highlight[];
  /** Called when the user creates a new highlight. */
  onAdd: (input: Omit<Highlight, "id" | "createdAt">) => void;
  /** Called when the user removes a highlight. */
  onRemove: (highlightId: string) => void;
  /** Additional className for the wrapper. */
  className?: string;
}

interface TextSegment {
  text: string;
  highlight: Highlight | null;
}

/**
 * Renders text with highlight overlays. Allows the user to select text
 * and create new highlights via a floating toolbar.
 */
export function HighlightableText({
  text,
  field,
  highlights,
  onAdd,
  onRemove,
  className,
}: HighlightableTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  // ── Build segments from highlights ──────────────────────────────

  const fieldHighlights = useMemo(
    () =>
      highlights
        .filter((h) => h.field === field)
        .sort((a, b) => a.startOffset - b.startOffset),
    [highlights, field]
  );

  const segments: TextSegment[] = useMemo(() => {
    if (fieldHighlights.length === 0) return [{ text, highlight: null }];

    const result: TextSegment[] = [];
    let cursor = 0;

    for (const h of fieldHighlights) {
      const start = Math.max(h.startOffset, cursor);
      const end = Math.min(h.endOffset, text.length);
      if (start > end) continue;

      // Plain text before this highlight
      if (cursor < start) {
        result.push({ text: text.slice(cursor, start), highlight: null });
      }

      // The highlighted segment
      result.push({ text: text.slice(start, end), highlight: h });
      cursor = end;
    }

    // Remaining text after last highlight
    if (cursor < text.length) {
      result.push({ text: text.slice(cursor), highlight: null });
    }

    return result;
  }, [text, fieldHighlights]);

  // ── Handle text selection ──────────────────────────────────────

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      return;
    }

    // Make sure selection is within our container
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const selectedText = sel.toString().trim();
    if (!selectedText) return;

    // Calculate the start/end offset relative to the full text
    // Walk the text nodes to find the offset
    const treeWalker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let charOffset = 0;
    let startOffset = 0;
    let endOffset = 0;
    let foundStart = false;
    let foundEnd = false;

    while (treeWalker.nextNode()) {
      const node = treeWalker.currentNode;
      const nodeLength = node.textContent?.length ?? 0;

      if (!foundStart && node === range.startContainer) {
        startOffset = charOffset + range.startOffset;
        foundStart = true;
      }
      if (!foundEnd && node === range.endContainer) {
        endOffset = charOffset + range.endOffset;
        foundEnd = true;
        break;
      }
      charOffset += nodeLength;
    }

    if (!foundStart || !foundEnd) return;

    // Position toolbar above the selection
    const rect = range.getBoundingClientRect();
    setToolbarPos({
      top: rect.top,
      left: rect.left + rect.width / 2,
    });

    setPendingSelection({
      text: selectedText,
      startOffset,
      endOffset,
    });
  }, []);

  const handleHighlightSelect = useCallback(
    (color: HighlightColor, note?: string) => {
      if (!pendingSelection) return;

      onAdd({
        text: pendingSelection.text,
        color,
        field,
        startOffset: pendingSelection.startOffset,
        endOffset: pendingSelection.endOffset,
        note,
      });

      // Clear selection
      window.getSelection()?.removeAllRanges();
      setToolbarPos(null);
      setPendingSelection(null);
    },
    [pendingSelection, field, onAdd]
  );

  const handleDismiss = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setToolbarPos(null);
    setPendingSelection(null);
    setActiveHighlightId(null);
  }, []);

  return (
    <>
      <span
        ref={containerRef}
        className={className}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
      >
        {segments.map((seg, i) => {
          if (!seg.highlight) {
            return <Fragment key={i}>{seg.text}</Fragment>;
          }

          const h = seg.highlight;
          const isActive = activeHighlightId === h.id;

          return (
            <mark
              key={`${h.id}-${i}`}
              className={`${BG[h.color]} rounded-sm px-px cursor-pointer relative group/mark transition-all hover:ring-1 hover:ring-current`}
              title={h.note || `Click to remove`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveHighlightId(isActive ? null : h.id);
              }}
            >
              {seg.text}

              {/* Delete popover on click */}
              {isActive && (
                <span
                  className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 whitespace-nowrap animate-in fade-in scale-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  {h.note && (
                    <span className="text-[10px] text-text-secondary max-w-[120px] truncate italic mr-1">
                      {h.note}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      onRemove(h.id);
                      setActiveHighlightId(null);
                    }}
                    className="p-0.5 rounded hover:bg-red-50 text-danger transition-colors"
                    title="Remove highlight"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </span>
              )}
            </mark>
          );
        })}
      </span>

      <HighlightToolbar
        position={toolbarPos}
        onSelect={handleHighlightSelect}
        onDismiss={handleDismiss}
      />
    </>
  );
}

// Made with Bob
