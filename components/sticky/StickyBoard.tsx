"use client";

import { useState } from "react";
import { Plus, StickyNote as StickyNoteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StickyNote } from "./StickyNote";
import { StickyModal } from "./StickyModal";
import { useSticky } from "@/hooks/useSticky";

export function StickyBoard() {
  const { stickies, loading, error, createSticky, updateSticky, deleteSticky } = useSticky();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSticky, setEditingSticky] = useState<{ id: string; content: string; color: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleCreate = async (content: string, color: string) => {
    setActionLoading(true);
    try {
      await createSticky(content, color);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to create sticky:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    const sticky = stickies.find((s) => s.id === id);
    if (sticky) {
      setEditingSticky({ id: sticky.id, content: sticky.content, color: sticky.color });
    }
  };

  const handleUpdate = async (content: string, color: string) => {
    if (!editingSticky) return;
    
    setActionLoading(true);
    try {
      await updateSticky(editingSticky.id, content, color);
      setEditingSticky(null);
    } catch (error) {
      console.error("Failed to update sticky:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await deleteSticky(id);
    } catch (error) {
      console.error("Failed to delete sticky:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary">Sticky Notes</h2>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Note
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Sticky Notes</h2>
          <p className="text-sm text-text-secondary mt-1">
            {stickies.length} {stickies.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} disabled={actionLoading}>
          <Plus className="w-4 h-4" />
          Add Note
        </Button>
      </div>

      {/* Grid */}
      {stickies.length === 0 ? (
        <Card className="border-2 border-dashed">
          <div className="flex items-center justify-center p-12">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
                <StickyNoteIcon className="w-8 h-8 text-accent-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  No notes yet
                </h3>
                <p className="text-text-secondary text-sm">
                  Create your first sticky note to capture ideas and insights
                </p>
              </div>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Create Note
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stickies.map((sticky) => (
            <div key={sticky.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <StickyNote
                id={sticky.id}
                content={sticky.content}
                color={sticky.color}
                onEdit={handleEdit}
                onDelete={handleDelete}
                disabled={actionLoading}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <StickyModal
          key="create"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleCreate}
          title="Create Sticky Note"
        />
      )}

      {/* Edit Modal */}
      {editingSticky && (
        <StickyModal
          key={`edit-${editingSticky.id}`}
          isOpen={true}
          onClose={() => setEditingSticky(null)}
          onSave={handleUpdate}
          initialContent={editingSticky.content}
          initialColor={editingSticky.color}
          title="Edit Sticky Note"
        />
      )}
    </div>
  );
}

// Made with Bob
