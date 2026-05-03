"use client";

import { useState } from "react";
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
} from "lucide-react";

// Represents the Double Diamond flow stages
type Stage = "discover" | "define" | "develop" | "scope" | "deliver";

interface AgentRun {
  id: string;
  name: string;
  status: "idle" | "running" | "complete" | "failed";
  timestamp?: string;
}

interface AgentPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

const STAGES: { key: Stage; label: string; icon: string }[] = [
  { key: "discover", label: "Discover", icon: "🔍" },
  { key: "define", label: "Define", icon: "📋" },
  { key: "develop", label: "Develop", icon: "⚡" },
  { key: "scope", label: "Scope", icon: "🎯" },
  { key: "deliver", label: "Deliver", icon: "📦" },
];

export function AgentPanel({ collapsed, onToggle }: AgentPanelProps) {
  const [expandedStages, setExpandedStages] = useState<Set<Stage>>(
    new Set(["discover"])
  );

  // Mock agent data — will be replaced with real Firestore listeners
  const [agents] = useState<Record<Stage, AgentRun[]>>({
    discover: [
      { id: "1", name: "Problem dump received", status: "complete", timestamp: "2 min ago" },
    ],
    define: [
      { id: "2", name: "ProblemResearchAgent #1", status: "complete", timestamp: "1 min ago" },
      { id: "3", name: "ProblemResearchAgent #2", status: "running" },
    ],
    develop: [],
    scope: [],
    deliver: [],
  });

  const toggleStage = (stage: Stage) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  };

  const getStatusIcon = (status: AgentRun["status"]) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />;
      case "running":
        return <Loader2 className="w-3.5 h-3.5 text-accent-primary animate-spin flex-shrink-0" />;
      case "failed":
        return <Circle className="w-3.5 h-3.5 text-danger flex-shrink-0" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />;
    }
  };

  if (collapsed) {
    return (
      <aside className="hidden lg:flex w-12 h-screen bg-white border-l border-gray-200 flex-col items-center py-4 gap-3">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-input-bg transition-colors" title="Open AI panel">
          <PanelRightOpen className="w-4 h-4 text-text-secondary" />
        </button>
        <Sparkles className="w-4 h-4 text-accent-primary" />
      </aside>
    );
  }

  return (
    <aside className="hidden lg:flex w-72 h-screen bg-white border-l border-gray-200 flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-primary" />
          <span className="text-sm font-bold text-text-heading">AI Agents</span>
        </div>
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-input-bg transition-colors">
          <PanelRightClose className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* Double Diamond stages */}
      <div className="flex-1 overflow-y-auto">
        {STAGES.map((stage, idx) => {
          const stageAgents = agents[stage.key];
          const isExpanded = expandedStages.has(stage.key);
          const hasRunning = stageAgents.some((a) => a.status === "running");
          const allComplete = stageAgents.length > 0 && stageAgents.every((a) => a.status === "complete");
          const isLocked = stageAgents.length === 0 && idx > 0;

          return (
            <div key={stage.key} className="border-b border-gray-50">
              <button
                onClick={() => toggleStage(stage.key)}
                className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-input-bg ${
                  isLocked ? "opacity-40" : ""
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                )}
                <span>{stage.icon}</span>
                <span className={`font-medium ${allComplete ? "text-success" : hasRunning ? "text-accent-primary" : "text-text-heading"}`}>
                  {stage.label}
                </span>
                {hasRunning && (
                  <Loader2 className="w-3 h-3 text-accent-primary animate-spin ml-auto" />
                )}
                {allComplete && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success ml-auto" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 space-y-1.5">
                  {stageAgents.length === 0 ? (
                    <p className="text-xs text-text-muted pl-6 py-1">
                      Not started yet
                    </p>
                  ) : (
                    stageAgents.map((agent) => (
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
                            <Clock className="w-2.5 h-2.5" />
                            {agent.timestamp}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gate status / action */}
      <div className="p-4 border-t border-gray-100">
        <div className="p-3 bg-accent-soft rounded-xl">
          <p className="text-xs font-semibold text-accent-primary mb-1">
            Current Gate
          </p>
          <p className="text-xs text-text-primary">
            Waiting for you to pick 1 problem to pursue.
          </p>
          <button className="mt-2 w-full py-2 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors">
            Review Briefs
          </button>
        </div>
      </div>
    </aside>
  );
}

// Made with Bob
