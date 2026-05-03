"use client";

import { Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface StickyNoteProps {
  id: string;
  content: string;
  color: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function StickyNote({ 
  id, 
  content, 
  color, 
  onEdit, 
  onDelete,
  disabled = false 
}: StickyNoteProps) {
  return (
    <Card
      className="group relative p-4 border-2 transition-all hover:shadow-lg overflow-hidden"
      style={{
        backgroundColor: `${color}20`,
        borderColor: color,
      }}
    >
      {/* Color indicator bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: color }}
      />

      {/* Content */}
      <p className="text-sm text-text-primary whitespace-pre-wrap break-words mt-2 mb-8 min-h-[60px]">
        {content}
      </p>

      {/* Actions */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(id)}
          disabled={disabled}
          className="h-7 w-7 p-0"
          title="Edit note"
        >
          <Edit className="w-3 h-3" />
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger>
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              className="h-7 w-7 p-0 text-danger hover:text-danger hover:bg-danger/10"
              title="Delete note"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Sticky Note?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your sticky note.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(id)}
                className="bg-danger hover:bg-danger/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}

// Made with Bob
