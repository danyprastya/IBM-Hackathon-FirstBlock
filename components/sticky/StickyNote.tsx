"use client";

import { Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StickyNoteProps {
  id: string;
  content: string;
  color: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function StickyNote({ id, content, color, onEdit, onDelete }: StickyNoteProps) {
  return (
    <div
      className="group relative p-4 rounded-lg border-2 transition-all hover:shadow-lg"
      style={{
        backgroundColor: `${color}20`,
        borderColor: color,
      }}
    >
      {/* Color indicator bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
        style={{ backgroundColor: color }}
      />

      {/* Content */}
      <p className="text-sm text-text-primary whitespace-pre-wrap break-words mt-2 mb-8">
        {content}
      </p>

      {/* Actions */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(id)}
          className="h-7 w-7 p-0"
        >
          <Edit className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(id)}
          className="h-7 w-7 p-0 text-danger hover:text-danger"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// Made with Bob
