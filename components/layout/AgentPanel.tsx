"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Clock,
  Lock,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { useAgentStatus, type StageData } from "@/hooks/useAgentStatus";

interface AgentPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AgentPanel({ collapsed, onToggle }: AgentPanelProps) {
  const pathname = usePathname();

  // Extract problemId from URL: /workspace/idea/[id]
  const ideaMatch = pathname.match(/\/workspace\/idea\/([^/]+)/);
  const problemId = ideaMatch ? ideaMatch[1] : null;

  const { stages, loading } = useAgentStatus(problemId);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    new Set(["discover", "define"])
  );

  const toggleStage = (key: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="size-3.5 text-success flex-shrink-0" />;
      case "running":
        return <Loader2 className="size-3.5 text-accent-primary animate-spin flex-shrink-0" />;
      case "failed":
        return <AlertCircle className="size-3.5 text-danger flex-shrink-0" />;
      default:
        return <Circle className="size-3.5 text-text-muted flex-shrink-0" />;
    }
  };

  const getGateLabel = (stage: StageData): string | null => {
    switch (stage.gateStatus) {
      case "waiting":
        if (stage.key === "define") return "Pick 1 problem to pursue";
        if (stage.key === "develop") return "Pick 1 solution to build";
        if (stage.key === "scope") return "Confirm scope + metrics";
        return "Awaiting your decision";
      case "passed":
        return null;
      default:
        return null;
    }
  };

  const getGateHref = (stageKey: string): string => {
    if (!problemId) return "#";
    switch (stageKey) {
      case "define": return `/workspace/idea/${problemId}/review`;
      case "develop": return `/workspace/idea/${problemId}/solutions`;
      case "scope": return `/workspace/idea/${problemId}/scope`;
      case "deliver": return `/workspace/idea/${problemId}/prd`;
      default: return `/workspace/idea/${problemId}`;
    }
  };

  const getGateButtonLabel = (stageKey: string): string => {
    switch (stageKey) {
      case "define": return "Review Briefs";
      case "develop": return "Compare Solutions";
      case "scope": return "Confirm Scope";
      case "deliver": return "View PRD";
      default: return "Review";
    }
  };

  if (collapsed) {
    return (
      <aside className="hidden md:flex w-12 h-screen bg-white border-l border-gray-200 flex-col items-center py-4 gap-3 sidebar-transition">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-input-bg transition-colors" title="Open AI panel">
          <PanelRightOpen className="size-4 text-text-secondary" />
        </button>
        <Sparkles className="size-4 text-accent-primary" />
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex w-80 h-screen bg-white border-l border-gray-200 flex-col sidebar-transition">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent-primary" />
          <span className="text-sm font-bold text-text-heading">AI Agents</span>
        </div>
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-input-bg transition-colors">
          <PanelRightClose className="size-4 text-text-secondary" />
        </button>
      </div>

      {/* No problem selected */}
      {!problemId && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <Sparkles className="size-8 text-text-muted mb-3" />
          <p className="text-sm font-medium text-text-heading mb-1">No idea selected</p>
          <p className="text-xs text-text-muted">Open an idea to see agent activity</p>
        </div>
      )}

      {/* Loading */}
      {problemId && loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-accent-primary" />
        </div>
      )}

      {/* Stages */}
      {problemId && !loading && (
        <div className="flex-1 overflow-y-auto">
          {stages.map((stage, idx) => {
            const isExpanded = expandedStages.has(stage.key);
            const hasRunning = stage.agents.some((a) => a.status === "running");
            const allComplete = stage.agents.length > 0 && stage.agents.every((a) => a.status === "complete");
            const isLocked = stage.agents.length === 0 && idx > 0 && stages[idx - 1].gateStatus !== "passed";
            const gateLabel = getGateLabel(stage);

            return (
              <div key={stage.key} className="border-b border-gray-50">
                <button
                  onClick={() => toggleStage(stage.key)}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-input-bg ${
                    isLocked ? "opacity-40" : ""
                  }`}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3.5 text-text-muted" />
                  ) : (
                    <ChevronRight className="size-3.5 text-text-muted" />
                  )}
                  <span>{stage.icon}</span>
                  <span className={`font-medium ${
                    allComplete ? "text-success" :
                    hasRunning ? "text-accent-primary" :
                    "text-text-heading"
                  }`}>
                    {stage.label}
                  </span>
                  {hasRunning && (
                    <Loader2 className="size-3 text-accent-primary animate-spin ml-auto" />
                  )}
                  {allComplete && !hasRunning && (
                    <CheckCircle2 className="size-3.5 text-success ml-auto" />
                  )}
                  {isLocked && (
                    <Lock className="size-3 text-text-muted ml-auto" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3 flex flex-col gap-1.5">
                    {stage.agents.length === 0 ? (
                      <p className="text-xs text-text-muted pl-6 py-1">
                        {isLocked ? "Locked — complete previous stage" : "Not started yet"}
                      </p>
                    ) : (
                      stage.agents.map((agent) => (
                        <div
                          key={agent.id}
                          className="flex items-center gap-2 pl-6 py-1.5 rounded-lg hover:bg-input-bg cursor-pointer transition-colors"
                        >
                          {getStatusIcon(agent.status)}
                          <span className="text-xs text-text-primary truncate flex-1">
                            {agent.name}
                          </span>
                          {agent.timestamp && (
                            <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                              <Clock className="size-2.5" />
                              {formatTimeAgo(agent.timestamp)}
                            </span>
                          )}
                        </div>
                      ))
                    )}

                    {/* Gate CTA */}
                    {gateLabel && (
                      <div className="ml-6 mt-1 p-3 bg-accent-soft rounded-xl">
                        <p className="text-xs font-semibold text-accent-primary mb-1">
                          Gate Decision
                        </p>
                        <p className="text-xs text-text-primary">{gateLabel}</p>
                        <Link
                          href={getGateHref(stage.key)}
                          className="mt-2 block w-full py-2 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors text-center"
                        >
                          {getGateButtonLabel(stage.key)}
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

// Made with Bob
