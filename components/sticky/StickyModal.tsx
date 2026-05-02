"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STICKY_COLORS } from "@/lib/data/content";

interface StickyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, color: string) => void;
  initialContent?: string;
  initialColor?: string;
  title: string;
}

export function StickyModal({
  isOpen,
  onClose,
  onSave,
  initialContent = "",
  initialColor = STICKY_COLORS[0].value,
  title,
}: StickyModalProps) {
  const [content, setContent] = useState(initialContent);
  const [color, setColor] = useState(initialColor);

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim(), color);
      setContent("");
      setColor(STICKY_COLORS[0].value);
    }
  };

  const handleClose = () => {
    setContent("");
    setColor(STICKY_COLORS[0].value);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-bg-card border border-border rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">{title}</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Note Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              rows={6}
              maxLength={500}
              className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-none"
            />
            <p className="text-xs text-text-muted text-right">
              {content.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Choose Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {STICKY_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    color === colorOption.value
                      ? "border-accent-primary scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content.trim()}
            className="flex-1"
          >
            Save Note
          </Button>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
