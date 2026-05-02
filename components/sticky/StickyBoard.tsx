"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyNote } from "./StickyNote";
import { StickyModal } from "./StickyModal";
import { useSticky } from "@/hooks/useSticky";

export function StickyBoard() {
  const { stickies, loading, error, createSticky, updateSticky, deleteSticky } = useSticky();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSticky, setEditingSticky] = useState<{ id: string; content: string; color: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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
    if (deleteConfirm === id) {
      setActionLoading(true);
      try {
        await deleteSticky(id);
        setDeleteConfirm(null);
      } catch (error) {
        console.error("Failed to delete sticky:", error);
      } finally {
        setActionLoading(false);
      }
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-accent-primary" />
          <p className="text-text-secondary">Loading notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <p className="text-danger">{error}</p>
        </div>
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
        <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
              <Plus className="w-8 h-8 text-accent-primary" />
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stickies.map((sticky) => (
            <StickyNote
              key={sticky.id}
              id={sticky.id}
              content={sticky.content}
              color={sticky.color}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <StickyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreate}
        title="Create Sticky Note"
      />

      {/* Edit Modal */}
      {editingSticky && (
        <StickyModal
          isOpen={true}
          onClose={() => setEditingSticky(null)}
          onSave={handleUpdate}
          initialContent={editingSticky.content}
          initialColor={editingSticky.color}
          title="Edit Sticky Note"
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed bottom-4 right-4 bg-bg-card border border-danger rounded-lg p-4 shadow-lg max-w-sm">
          <p className="text-sm text-text-primary mb-3">
            Click delete again to confirm
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleDelete(deleteConfirm)}
              className="flex-1 bg-danger hover:bg-danger/90"
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob
