"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="content">Note Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              rows={6}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-text-muted text-right">
              {content.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>Choose Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {STICKY_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`h-10 rounded-lg border-2 transition-all hover:scale-105 ${
                    color === colorOption.value
                      ? "border-accent-primary scale-110 ring-2 ring-accent-primary/20"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.name}
                  aria-label={`Select ${colorOption.name} color`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!content.trim()}>
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Made with Bob
