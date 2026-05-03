"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FolderOpen,
  FolderClosed,
  Plus,
  FolderPlus,
  Search,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { useProblems, type Problem } from "@/hooks/useProblems";
import { actions } from "@/lib/store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ─── Sortable Idea Item ──────────────────────────────────────────────────────

// Clickable wrapper for navigation (separate from drag handle)
function IdeaLink({ idea, isActive }: { idea: Problem; isActive: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `idea:${idea.id}`, data: { type: "idea", idea } });

  const pathname = usePathname();
  const href = `/workspace/idea/${idea.id}`;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const title =
    idea.title || idea.rawInput.slice(0, 50) + (idea.rawInput.length > 50 ? "…" : "");

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle – grab the entire row but allow click-through to link */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing rounded-md"
        onClick={(e) => e.stopPropagation()}
      />
      <Link
        href={href}
        className={`relative flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-md text-[13px] select-none transition-colors ${
          pathname === href
            ? "bg-accent-soft text-accent-primary font-medium"
            : "text-text-secondary hover:bg-input-bg"
        }`}
      >
        <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
        <span className="truncate">{title}</span>
      </Link>
    </div>
  );
}

// ─── Sortable Folder ─────────────────────────────────────────────────────────

interface FolderRowProps {
  folderName: string;
  ideaCount: number;
  isExpanded: boolean;
  isOver: boolean;
  onToggle: () => void;
  onRename: (newName: string) => void;
  isDragOverlay?: boolean;
}

function FolderRow({
  folderName,
  ideaCount,
  isExpanded,
  isOver,
  onToggle,
  onRename,
  isDragOverlay,
}: FolderRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `folder:${folderName}`, data: { type: "folder", folderName } });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(folderName);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(folderName);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== folderName) onRename(trimmed);
    setEditing(false);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md transition-colors ${
        isOver && !isDragOverlay ? "bg-accent-glow ring-1 ring-accent-primary/30" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-1 px-1 py-1 rounded-md text-[13px] transition-colors group hover:bg-input-bg ${
          isDragOverlay ? "bg-input-bg shadow-md" : ""
        }`}
        {...attributes}
        {...listeners}
      >
        {/* Chevron */}
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
        )}

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-text-muted flex-shrink-0" />
        ) : (
          <FolderClosed className="w-4 h-4 text-text-muted flex-shrink-0" />
        )}

        {/* Name / inline editor */}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent text-text-heading text-[13px] focus:outline-none border-b border-accent-primary"
            autoFocus
          />
        ) : (
          <span className="truncate flex-1 text-left text-text-primary font-medium">
            {folderName}
          </span>
        )}

        {/* Count + rename */}
        {!editing && (
          <>
            <span className="ml-auto text-[11px] text-text-muted group-hover:opacity-0 transition-opacity">
              {ideaCount}
            </span>
            <span
              role="button"
              onClick={startEdit}
              className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all"
              title="Rename folder"
            >
              <Pencil className="w-3 h-3 text-text-muted" />
            </span>
          </>
        )}
      </button>
    </div>
  );
}

// ─── New Folder Row ──────────────────────────────────────────────────────────

function NewFolderInput({ onConfirm, onCancel }: { onConfirm: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState("New Folder");
  const ref = useRef<HTMLInputElement>(null);

  const confirm = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-input-bg rounded-md">
      <FolderClosed className="w-4 h-4 text-text-muted flex-shrink-0" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={confirm}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirm();
          if (e.key === "Escape") onCancel();
        }}
        className="flex-1 bg-transparent text-[13px] text-text-heading focus:outline-none border-b border-accent-primary"
        autoFocus
        onFocus={(e) => e.target.select()}
      />
      <button onClick={confirm} className="p-0.5 hover:bg-gray-200 rounded"><Check className="w-3 h-3 text-success" /></button>
      <button onClick={onCancel} className="p-0.5 hover:bg-gray-200 rounded"><X className="w-3 h-3 text-text-muted" /></button>
    </div>
  );
}

// ─── Main Sidebar ────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { userData } = useUserData();
  const { folders, loading: problemsLoading } = useProblems();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["Drafts"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [overFolder, setOverFolder] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<{ type: "idea" | "folder"; id: string } | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  // Local folder-order override (persists in component memory only)
  const [localFolderOrder, setLocalFolderOrder] = useState<string[]>([]);

  const displayName = userData?.name || user?.displayName || "User";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const toggleFolder = (name: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // ── Derived folder data ──────────────────────────────────────────

  const filteredFolders: Record<string, Problem[]> = searchQuery.trim()
    ? Object.fromEntries(
        Object.entries(folders)
          .map(([name, problems]) => [
            name,
            problems.filter(
              (p) =>
                p.rawInput.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.title.toLowerCase().includes(searchQuery.toLowerCase())
            ),
          ])
          .filter(([, problems]) => (problems as Problem[]).length > 0)
      )
    : folders;

  // Merge server folder names with local order + locally created folders
  const serverNames = Object.keys(filteredFolders).sort((a, b) =>
    a === "Drafts" ? -1 : b === "Drafts" ? 1 : a.localeCompare(b)
  );

  // Apply local ordering; append any server names not yet in local order
  const allKnownFolders = localFolderOrder.length > 0
    ? [
        ...localFolderOrder.filter((f) => serverNames.includes(f) || (filteredFolders[f] !== undefined)),
        ...serverNames.filter((f) => !localFolderOrder.includes(f)),
      ]
    : serverNames;

  // ── DnD handlers ────────────────────────────────────────────────

  const handleDragStart = ({ active }: DragStartEvent) => {
    const data = active.data.current as { type: "idea" | "folder" };
    setActiveItem({ type: data.type, id: active.id as string });
    if (data.type === "idea") {
      // Initialise local order if not yet set
      if (localFolderOrder.length === 0) setLocalFolderOrder(allKnownFolders);
    }
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) { setOverFolder(null); return; }
    const overData = over.data.current as { type?: string; folderName?: string } | undefined;
    if (overData?.type === "folder") setOverFolder(overData.folderName ?? null);
    else setOverFolder(null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveItem(null);
    setOverFolder(null);
    if (!over) return;

    const activeData = active.data.current as { type: string; idea?: Problem; folderName?: string };
    const overData = over.data.current as { type?: string; folderName?: string; idea?: Problem };

    // ── Idea dropped on a folder → move to that folder ──────────
    if (activeData.type === "idea" && overData?.type === "folder") {
      const idea = activeData.idea!;
      const targetFolder = overData.folderName!;
      if (idea.folder !== targetFolder) {
        try {
          await actions.updateProblem(idea.id, { folder: targetFolder });
        } catch (err) {
          console.error("Move folder error:", err);
        }
      }
      return;
    }

    // ── Idea dropped on another idea → move to its parent folder ─
    if (activeData.type === "idea" && overData?.type === "idea") {
      const idea = activeData.idea!;
      const targetIdea = overData.idea!;
      if (idea.folder !== targetIdea.folder) {
        try {
          await actions.updateProblem(idea.id, { folder: targetIdea.folder ?? "Drafts" });
        } catch (err) {
          console.error("Move folder error:", err);
        }
      }
      return;
    }

    // ── Folder dragged → reorder locally ─────────────────────────
    if (activeData.type === "folder" && overData?.type === "folder") {
      const from = activeData.folderName!;
      const to = overData.folderName!;
      if (from === to) return;
      const current = localFolderOrder.length > 0 ? localFolderOrder : allKnownFolders;
      const fromIdx = current.indexOf(from);
      const toIdx = current.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) return;
      const next = [...current];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, from);
      setLocalFolderOrder(next);
    }
  };

  // ── Folder actions ───────────────────────────────────────────────

  const handleCreateFolder = (name: string) => {
    // Add to local order (no Firestore doc needed — folders are derived from problems)
    setLocalFolderOrder((prev) => {
      const base = prev.length > 0 ? prev : allKnownFolders;
      return base.includes(name) ? base : [...base, name];
    });
    setExpandedFolders((prev) => new Set([...prev, name]));
    setCreatingFolder(false);
  };

  const handleRenameFolder = async (oldName: string, newName: string) => {
    if (oldName === newName) return;
    const problemsInFolder = folders[oldName] ?? [];
    // Move all problems in this folder to the new name
    await Promise.all(
      problemsInFolder.map((p) =>
        actions.updateProblem(p.id, { folder: newName }).catch(console.error)
      )
    );
    // Update local order
    setLocalFolderOrder((prev) =>
      (prev.length > 0 ? prev : allKnownFolders).map((f) => (f === oldName ? newName : f))
    );
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(oldName)) { next.delete(oldName); next.add(newName); }
      return next;
    });
  };

  // ── Overlay items ────────────────────────────────────────────────

  const getActiveIdea = (): Problem | null => {
    if (!activeItem || activeItem.type !== "idea") return null;
    const ideaId = activeItem.id.replace("idea:", "");
    for (const probs of Object.values(folders)) {
      const found = probs.find((p) => p.id === ideaId);
      if (found) return found;
    }
    return null;
  };

  // ── Collapsed state ──────────────────────────────────────────────

  if (collapsed) {
    return (
      <aside className="hidden md:flex w-12 h-screen bg-white border-r border-gray-200 flex-col items-center py-4 gap-3">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-input-bg transition-colors" title="Expand sidebar">
          <PanelLeftOpen className="w-4 h-4 text-text-secondary" />
        </button>
        <Link href="/workspace" className="p-2 rounded-lg hover:bg-input-bg transition-colors" title="Home">
          <Home className="w-4 h-4 text-text-secondary" />
        </Link>
        <button className="p-2 rounded-lg hover:bg-input-bg transition-colors mt-auto" onClick={handleSignOut} title="Sign out">
          <LogOut className="w-4 h-4 text-text-secondary" />
        </button>
      </aside>
    );
  }

  // ── Full sidebar ─────────────────────────────────────────────────

  const activeIdea = getActiveIdea();
  const activeFolderName = activeItem?.type === "folder"
    ? activeItem.id.replace("folder:", "")
    : null;

  return (
    <aside className="hidden md:flex w-64 h-screen bg-white border-r border-gray-200 flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <Link href="/workspace" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-text-heading rounded-lg flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-sm" />
          </div>
          <span className="text-sm font-bold text-text-heading">FirstBlock</span>
        </Link>
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-input-bg transition-colors">
          <PanelLeftClose className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-input-bg rounded-lg">
          <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ideas..."
            className="flex-1 bg-transparent text-sm text-text-heading placeholder:text-text-muted focus:outline-none"
          />
        </div>
      </div>

      {/* New Idea + New Folder */}
      <div className="px-3 pb-3 flex gap-2">
        <Link
          href="/workspace/new"
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Idea
        </Link>
        <button
          onClick={() => setCreatingFolder(true)}
          title="New Folder"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 hover:bg-input-bg transition-colors text-text-secondary"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Folder Tree */}
      <nav className="flex-1 overflow-y-auto px-2">
        {/* Section label */}
        <p className="px-2 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Projects
        </p>

        {problemsLoading ? (
          <div className="flex items-center gap-2 px-2 py-4 text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {/* New folder input */}
            {creatingFolder && (
              <div className="mb-1">
                <NewFolderInput
                  onConfirm={handleCreateFolder}
                  onCancel={() => setCreatingFolder(false)}
                />
              </div>
            )}

            {allKnownFolders.length === 0 && !creatingFolder ? (
              <div className="px-2 py-4 text-center">
                <p className="text-xs text-text-muted">No ideas yet.</p>
                <p className="text-xs text-text-muted mt-1">Tap "New Idea" to start.</p>
              </div>
            ) : (
              <SortableContext
                items={allKnownFolders.map((f) => `folder:${f}`)}
                strategy={verticalListSortingStrategy}
              >
                {allKnownFolders.map((folderName) => {
                  const ideas = filteredFolders[folderName] ?? [];
                  const isExpanded = expandedFolders.has(folderName);

                  return (
                    <div key={folderName} className="mb-0.5">
                      <FolderRow
                        folderName={folderName}
                        ideaCount={ideas.length}
                        isExpanded={isExpanded}
                        isOver={overFolder === folderName}
                        onToggle={() => toggleFolder(folderName)}
                        onRename={(newName) => handleRenameFolder(folderName, newName)}
                      />

                      {/* Children with VS Code-style indent guide */}
                      {isExpanded && (
                        <div className="relative ml-4">
                          {/* Vertical indentation line */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 hover:bg-accent-primary/50 transition-colors"
                            style={{ left: "7px" }}
                          />

                          <SortableContext
                            items={ideas.map((i) => `idea:${i.id}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="ml-5 space-y-0.5 py-0.5">
                              {ideas.length === 0 ? (
                                <p className="text-[12px] text-text-muted pl-2 py-1 italic">Empty folder</p>
                              ) : (
                                ideas.map((idea) => (
                                  <IdeaLink
                                    key={idea.id}
                                    idea={idea}
                                    isActive={pathname === `/workspace/idea/${idea.id}`}
                                  />
                                ))
                              )}
                            </div>
                          </SortableContext>
                        </div>
                      )}
                    </div>
                  );
                })}
              </SortableContext>
            )}

            {/* Drag overlays */}
            <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
              {activeIdea && (
                <div className="flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-md text-[13px] bg-white shadow-lg border border-accent-primary/30 text-accent-primary font-medium w-48">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {activeIdea.title || activeIdea.rawInput.slice(0, 40)}
                  </span>
                </div>
              )}
              {activeFolderName && (
                <div className="flex items-center gap-1 px-1 py-1 rounded-md text-[13px] bg-white shadow-lg border border-gray-200 text-text-primary font-medium w-48">
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                  <FolderOpen className="w-4 h-4 text-text-muted" />
                  <span className="truncate">{activeFolderName}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-xs font-semibold text-accent-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-heading truncate">{displayName}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg hover:bg-input-bg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// Made with Bob
