"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { useProblems, type Problem } from "@/hooks/useProblems";
import { actions } from "@/lib/store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface SidebarConfig {
  folderOrder: string[];
  emptyFolders: string[];
  ideaOrderByFolder: Record<string, string[]>;
}

// ─── Persist sidebar config to Firestore ─────────────────────────────────────

async function saveSidebarConfig(uid: string, config: SidebarConfig) {
  try {
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), { sidebarConfig: config });
  } catch (err) {
    console.error("[sidebar] save config error:", err);
  }
}

// Reorder array: move item from fromIdx to toIdx
function reorder<T>(arr: T[], fromIdx: number, toIdx: number): T[] {
  const next = [...arr];
  const [item] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, item);
  return next;
}

// ─── IdeaLink (sortable + navigable) ─────────────────────────────────────────
// FIX: listeners on outer div, NO overlay stopPropagation.
// PointerSensor distance:8 means taps (<8px) → click fires normally.

function IdeaLink({ idea, isActive }: { idea: Problem; isActive: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `idea:${idea.id}`, data: { type: "idea", idea } });

  const [editing, setEditing] = useState(false);
  const title = idea.title && idea.title.trim()
    ? idea.title
    : idea.rawInput.replace(/<[^>]+>/g, " ").trim().slice(0, 50) +
      (idea.rawInput.length > 50 ? "…" : "");
  
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  const href = `/workspace/idea/${idea.id}`;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const startEdit = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = async () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) {
      try {
        await actions.updateProblem(idea.id, { title: trimmed });
      } catch (err) {
        console.error("Rename idea error:", err);
      }
    }
    setEditing(false);
  };

  // Global F2 listener for active idea
  useEffect(() => {
    if (!isActive || editing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setDraft(title);
        setEditing(true);
        setTimeout(() => inputRef.current?.select(), 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, editing, title]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none select-none group relative"
    >
      {editing ? (
        <div className={`flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-md text-[13px] ${
          isActive ? "bg-accent-soft" : "bg-input-bg"
        }`}>
          <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-70 text-text-muted" />
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
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent text-text-heading focus:outline-none border-b border-accent-primary"
            autoFocus
          />
        </div>
      ) : (
        <Link
          href={href}
          draggable={false}
          className={`flex items-center gap-1.5 pl-2 pr-8 py-1 rounded-md text-[13px] transition-colors ${
            isActive
              ? "bg-accent-soft text-accent-primary font-medium"
              : "text-text-secondary hover:bg-input-bg"
          }`}
        >
          <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
          <span className="truncate flex-1">{title}</span>
        </Link>
      )}

      {/* Pencil icon for hover-based rename (like FolderRow) */}
      {!editing && (
        <span
          role="button"
          onClick={startEdit}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all z-10"
          title="Rename idea (F2)"
        >
          <Pencil className="w-3 h-3 text-text-muted" />
        </span>
      )}
    </div>
  );
}

// ─── FolderRow (sortable) ─────────────────────────────────────────────────────

interface FolderRowProps {
  folderName: string;
  ideaCount: number;
  isExpanded: boolean;
  isOver: boolean;
  onToggle: () => void;
  onRename: (newName: string) => void;
}

function FolderRow({
  folderName,
  ideaCount,
  isExpanded,
  isOver,
  onToggle,
  onRename,
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
        isOver ? "bg-accent-glow ring-1 ring-accent-primary/30" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1 px-1 py-1 rounded-md text-[13px] transition-colors group hover:bg-input-bg"
        {...attributes}
        {...listeners}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-text-muted flex-shrink-0" />
        ) : (
          <FolderClosed className="w-4 h-4 text-text-muted flex-shrink-0" />
        )}

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

// ─── NewFolderInput ───────────────────────────────────────────────────────────

function NewFolderInput({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("New Folder");

  const confirm = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-input-bg rounded-md mb-0.5">
      <FolderClosed className="w-4 h-4 text-text-muted flex-shrink-0" />
      <input
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
      <button
        onMouseDown={(e) => { e.preventDefault(); confirm(); }}
        className="p-0.5 hover:bg-gray-200 rounded"
      >
        <Check className="w-3 h-3 text-success" />
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
        className="p-0.5 hover:bg-gray-200 rounded"
      >
        <X className="w-3 h-3 text-text-muted" />
      </button>
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { userData } = useUserData();
  const { folders: firestoreFolders, loading: problemsLoading } = useProblems();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["Drafts"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [overFolder, setOverFolder] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<{ type: "idea" | "folder"; id: string } | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [folderOrder, setFolderOrder] = useState<string[]>([]);
  const [emptyFolders, setEmptyFolders] = useState<string[]>([]);
  // ideaOrderByFolder: local reorder within a folder { folderName: [id, id, ...] }
  const [ideaOrderByFolder, setIdeaOrderByFolder] = useState<Record<string, string[]>>({});
  // optimisticFolderMap: immediate visual move before Firestore responds { ideaId: folderName }
  const [optimisticFolderMap, setOptimisticFolderMap] = useState<Record<string, string>>({});
  const [configLoaded, setConfigLoaded] = useState(false);

  // New Idea Dialog
  const [showNewIdeaDialog, setShowNewIdeaDialog] = useState(false);
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const router = useRouter();

  const uid = user?.uid ?? null;
  const displayName = userData?.name || user?.displayName || "User";

  // ── Load persisted config on mount ──────────────────────────────

  useEffect(() => {
    if (!userData || configLoaded) return;
    const cfg = userData.sidebarConfig;
    if (cfg) {
      setFolderOrder(cfg.folderOrder ?? []);
      setEmptyFolders(cfg.emptyFolders ?? []);
      setIdeaOrderByFolder((cfg as SidebarConfig).ideaOrderByFolder ?? {});
    }
    setConfigLoaded(true);
  }, [userData, configLoaded]);

  // ── Persist config (debounced 600ms) ─────────────────────────────

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistConfig = useCallback(
    (order: string[], empty: string[], ideaOrder: Record<string, string[]>) => {
      if (!uid) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveSidebarConfig(uid, { folderOrder: order, emptyFolders: empty, ideaOrderByFolder: ideaOrder });
      }, 600);
    },
    [uid]
  );

  // distance:8 → taps/clicks (<8px movement) are NOT treated as drag starts
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Derived folder list ──────────────────────────────────────────

  // All folder names known from Firestore data
  const firestoreNames = Object.keys(firestoreFolders).sort((a, b) =>
    a === "Drafts" ? -1 : b === "Drafts" ? 1 : a.localeCompare(b)
  );

  // All known folder names = Firestore folders + empty user-created folders
  const allKnownNames = Array.from(
    new Set([...firestoreNames, ...emptyFolders])
  );

  // Apply user-defined ordering; new names append at end
  const orderedNames =
    folderOrder.length > 0
      ? [
          ...folderOrder.filter((f) => allKnownNames.includes(f)),
          ...allKnownNames.filter((f) => !folderOrder.includes(f)),
        ]
      : allKnownNames;

  // Filter by search (empty folders always show if not searching)
  const filteredNames = searchQuery.trim()
    ? orderedNames.filter((name) => {
        const ideas = firestoreFolders[name] ?? [];
        return ideas.some(
          (p) =>
            p.rawInput.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : orderedNames;

  // ── Toggle ───────────────────────────────────────────────────────

  const toggleFolder = (name: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // ── Sign out ─────────────────────────────────────────────────────

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // ── DnD ─────────────────────────────────────────────────────────

  const handleDragStart = ({ active }: DragStartEvent) => {
    const data = active.data.current as { type: "idea" | "folder" };
    setActiveItem({ type: data.type, id: active.id as string });
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) { setOverFolder(null); return; }
    const d = over.data.current as { type?: string; folderName?: string } | undefined;
    setOverFolder(d?.type === "folder" ? (d.folderName ?? null) : null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveItem(null);
    setOverFolder(null);
    if (!over) return;

    const activeData = active.data.current as { type: string; idea?: Problem; folderName?: string };
    const overData = over.data.current as { type?: string; folderName?: string; idea?: Problem };

    // ── Idea → folder header: move folder ──────────────────────────
    if (activeData.type === "idea" && overData?.type === "folder") {
      const idea = activeData.idea!;
      const target = overData.folderName!;
      if ((optimisticFolderMap[idea.id] ?? idea.folder) === target) return;
      // Optimistic update → instant UI
      setOptimisticFolderMap((prev) => ({ ...prev, [idea.id]: target }));
      try {
        await actions.updateProblem(idea.id, { folder: target });
      } catch (err) {
        // Revert
        setOptimisticFolderMap((prev) => { const n = { ...prev }; delete n[idea.id]; return n; });
        console.error("Move idea error:", err);
      }
      return;
    }

    // ── Idea → idea: reorder within folder OR cross-folder move ─────
    if (activeData.type === "idea" && overData?.type === "idea") {
      const idea = activeData.idea!;
      const targetIdea = overData.idea!;
      const ideaEffectiveFolder = optimisticFolderMap[idea.id] ?? idea.folder ?? "Drafts";
      const targetEffectiveFolder = optimisticFolderMap[targetIdea.id] ?? targetIdea.folder ?? "Drafts";

      if (ideaEffectiveFolder === targetEffectiveFolder) {
        // ── Same folder: reorder locally ──────────────────────────
        const folder = ideaEffectiveFolder;
        const rawIdeas = getIdeasForFolder(folder);
        const currentOrder = rawIdeas.map((i) => i.id);
        const fromIdx = currentOrder.indexOf(idea.id);
        const toIdx = currentOrder.indexOf(targetIdea.id);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
        const nextOrder = reorder(currentOrder, fromIdx, toIdx);
        const nextIdeaOrder = { ...ideaOrderByFolder, [folder]: nextOrder };
        setIdeaOrderByFolder(nextIdeaOrder);
        persistConfig(folderOrder.length > 0 ? folderOrder : orderedNames, emptyFolders, nextIdeaOrder);
      } else {
        // ── Cross-folder: optimistic move ─────────────────────────
        const target = targetEffectiveFolder;
        setOptimisticFolderMap((prev) => ({ ...prev, [idea.id]: target }));
        try {
          await actions.updateProblem(idea.id, { folder: target });
        } catch (err) {
          setOptimisticFolderMap((prev) => { const n = { ...prev }; delete n[idea.id]; return n; });
          console.error("Move idea error:", err);
        }
      }
      return;
    }

    // ── Folder → folder: reorder folders ───────────────────────────
    if (activeData.type === "folder" && overData?.type === "folder") {
      const from = activeData.folderName!;
      const to = overData.folderName!;
      if (from === to) return;
      const base = folderOrder.length > 0 ? folderOrder : orderedNames;
      const fromIdx = base.indexOf(from);
      const toIdx = base.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) return;
      const next = reorder(base, fromIdx, toIdx);
      setFolderOrder(next);
      persistConfig(next, emptyFolders, ideaOrderByFolder);
    }
  };

  // ── Folder CRUD ──────────────────────────────────────────────────

  // ── Helper: get ordered ideas for a folder (local order + optimistic moves) ─

  const getIdeasForFolder = (folderName: string): Problem[] => {
    const allIdeas = Object.values(firestoreFolders).flat();
    const folderIdeas = allIdeas.filter((p) => {
      const effective = optimisticFolderMap[p.id] ?? p.folder ?? "Drafts";
      return effective === folderName;
    });
    const customOrder = ideaOrderByFolder[folderName];
    if (!customOrder) return folderIdeas;
    // Sort by custom order, append any new items at end
    return [
      ...customOrder.map((id) => folderIdeas.find((p) => p.id === id)).filter(Boolean) as Problem[],
      ...folderIdeas.filter((p) => !customOrder.includes(p.id)),
    ];
  };

  const handleCreateFolder = (name: string) => {
    if (allKnownNames.includes(name)) { setCreatingFolder(false); return; }
    const nextEmpty = [...emptyFolders, name];
    const nextOrder = [...(folderOrder.length > 0 ? folderOrder : orderedNames), name];
    setEmptyFolders(nextEmpty);
    setFolderOrder(nextOrder);
    setExpandedFolders((prev) => new Set([...prev, name]));
    persistConfig(nextOrder, nextEmpty, ideaOrderByFolder);
    setCreatingFolder(false);
  };

  const handleRenameFolder = async (oldName: string, newName: string) => {
    if (oldName === newName) return;
    const problems = firestoreFolders[oldName] ?? [];
    await Promise.all(
      problems.map((p) => actions.updateProblem(p.id, { folder: newName }).catch(console.error))
    );
    const nextEmpty = emptyFolders.map((f) => (f === oldName ? newName : f));
    const nextOrder = (folderOrder.length > 0 ? folderOrder : orderedNames).map(
      (f) => (f === oldName ? newName : f)
    );
    const nextIdeaOrder = Object.fromEntries(
      Object.entries(ideaOrderByFolder).map(([k, v]) => [k === oldName ? newName : k, v])
    );
    setEmptyFolders(nextEmpty);
    setFolderOrder(nextOrder);
    setIdeaOrderByFolder(nextIdeaOrder);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(oldName)) { next.delete(oldName); next.add(newName); }
      return next;
    });
    persistConfig(nextOrder, nextEmpty, nextIdeaOrder);
  };

  // ── Drag overlays ────────────────────────────────────────────────

  const getActiveIdea = (): Problem | null => {
    if (!activeItem || activeItem.type !== "idea") return null;
    const id = activeItem.id.replace("idea:", "");
    for (const probs of Object.values(firestoreFolders)) {
      const found = probs.find((p) => p.id === id);
      if (found) return found;
    }
    return null;
  };

  const activeFolderName =
    activeItem?.type === "folder" ? activeItem.id.replace("folder:", "") : null;
  const activeIdea = getActiveIdea();

  // ── Collapsed ────────────────────────────────────────────────────

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
        <button
          onClick={() => setShowNewIdeaDialog(true)}
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Idea
        </button>
        <button
          onClick={() => setCreatingFolder(true)}
          title="New Folder"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 hover:bg-input-bg transition-colors text-text-secondary"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Tree */}
      <nav className="flex-1 overflow-y-auto px-2">
        <p className="px-2 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Projects
        </p>

        {problemsLoading && !configLoaded ? (
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
            {creatingFolder && (
              <NewFolderInput
                onConfirm={handleCreateFolder}
                onCancel={() => setCreatingFolder(false)}
              />
            )}

            {filteredNames.length === 0 && !creatingFolder ? (
              <div className="px-2 py-4 text-center">
                <p className="text-xs text-text-muted">No ideas yet.</p>
                <p className="text-xs text-text-muted mt-1">Tap &quot;New Idea&quot; to start.</p>
              </div>
            ) : (
              <SortableContext
                items={filteredNames.map((f) => `folder:${f}`)}
                strategy={verticalListSortingStrategy}
              >
                {filteredNames.map((folderName) => {
                  const ideas = getIdeasForFolder(folderName);
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

                      {isExpanded && (
                        <div className="relative ml-4">
                          {/* VS Code indent guide */}
                          <div
                            className="absolute top-0 bottom-0 w-px bg-gray-200 hover:bg-accent-primary/40 transition-colors cursor-pointer"
                            style={{ left: "7px" }}
                            onClick={() => toggleFolder(folderName)}
                          />
                          <SortableContext
                            items={ideas.map((i) => `idea:${i.id}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="ml-5 space-y-0.5 py-0.5">
                              {ideas.length === 0 ? (
                                <p className="text-[12px] text-text-muted pl-2 py-1 italic">
                                  Empty — drag ideas here
                                </p>
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

            <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
              {activeIdea && (
                <div className="flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-md text-[13px] bg-white shadow-lg border border-accent-primary/30 text-accent-primary font-medium w-52">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {activeIdea.title || activeIdea.rawInput.slice(0, 40)}
                  </span>
                </div>
              )}
              {activeFolderName && (
                <div className="flex items-center gap-1 px-1 py-1 rounded-md text-[13px] bg-white shadow-lg border border-gray-200 text-text-primary font-medium w-52">
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

      <Dialog open={showNewIdeaDialog} onOpenChange={setShowNewIdeaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name Your Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newIdeaTitle}
              onChange={(e) => setNewIdeaTitle(e.target.value)}
              placeholder="e.g. AI Content Generator"
              className="w-full bg-input-bg text-text-heading px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-accent-primary transition-colors"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setShowNewIdeaDialog(false);
                  router.push(`/workspace/new?title=${encodeURIComponent(newIdeaTitle.trim())}`);
                  setNewIdeaTitle("");
                }
              }}
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowNewIdeaDialog(false)}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowNewIdeaDialog(false);
                router.push(`/workspace/new?title=${encodeURIComponent(newIdeaTitle.trim())}`);
                setNewIdeaTitle("");
              }}
              className="px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Start Board
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

// Made with Bob
