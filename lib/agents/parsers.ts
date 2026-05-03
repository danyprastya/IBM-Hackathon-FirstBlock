// Brief parsers — extract structured data from agent text output
// Used by API routes to convert raw agent output → Firestore documents

import type { CompetitionLevel, Verdict } from "@/lib/firebase/collections";

// ─── Problem Brief Parser ─────────────────────────────────────────

export interface ParsedProblemBrief {
  marketSignal: string;
  painEvidence: string;
  competition: CompetitionLevel;
  competitionNote: string;
  aiVerdict: Verdict;
  aiReason: string;
}

/**
 * Parse ProblemResearchAgent output into structured brief.
 * Expects format from AGENT_PROMPTS.md ProblemResearch output spec.
 */
export function parseProblemBrief(output: string): ParsedProblemBrief {
  const brief: ParsedProblemBrief = {
    marketSignal: extractField(output, "Market signal") || "No signal found",
    painEvidence: extractField(output, "Pain evidence") || "No evidence found",
    competition: extractCompetition(output),
    competitionNote: extractField(output, "Note") || "No data",
    aiVerdict: extractVerdict(output),
    aiReason: extractField(output, "Reason") || "No reason provided",
  };

  return brief;
}

// ─── Solution Brief Parser ────────────────────────────────────────

export interface ParsedSolutionBrief {
  feasibility: string;
  differentiation: string;
  founderEdge: string;
  aiVerdict: Verdict;
  aiReason: string;
}

/**
 * Parse SolutionResearchAgent output into structured brief.
 */
export function parseSolutionBrief(output: string): ParsedSolutionBrief {
  return {
    feasibility: extractField(output, "Feasibility") || "No data",
    differentiation: extractField(output, "Differentiation") || "No data",
    founderEdge: extractField(output, "Founder edge") || "No clear founder edge identified.",
    aiVerdict: extractVerdict(output),
    aiReason: extractField(output, "Reason") || "No reason provided",
  };
}

// ─── Solution Generator Parser ────────────────────────────────────

export interface ParsedSolutions {
  count: number;
  directions: string[];
}

/**
 * Parse SolutionGeneratorAgent output into N + directions.
 */
export function parseSolutionDirections(output: string): ParsedSolutions {
  const countMatch = output.match(/N:\s*(\d+)/);
  const count = countMatch ? parseInt(countMatch[1], 10) : 2;

  const directions: string[] = [];
  const dirPattern = /Solution\s+[A-Z]:\s*(.+)/gi;
  let match;
  while ((match = dirPattern.exec(output)) !== null) {
    directions.push(match[1].trim());
  }

  return {
    count: Math.min(Math.max(count, 2), 4),
    directions: directions.slice(0, 4),
  };
}

// ─── Scope Parser ─────────────────────────────────────────────────

export interface ParsedScope {
  scopeIn: string[];
  scopeOut: string[];
  constraintNote: string;
}

/**
 * Parse ScopeAgent output into in/out lists.
 */
export function parseScope(output: string): ParsedScope {
  const scopeIn = extractNumberedList(output, "Scope IN");
  const scopeOut = extractNumberedList(output, "Scope OUT");
  const constraintNote = extractField(output, "Constraint note") || "";

  return { scopeIn, scopeOut, constraintNote };
}

// ─── Metrics Parser ───────────────────────────────────────────────

export interface ParsedMetrics {
  adoption: string;
  value: string;
  business: string;
  calibrationNote: string;
}

/**
 * Parse MetricsAgent output into three metrics.
 */
export function parseMetrics(output: string): ParsedMetrics {
  return {
    adoption: extractField(output, "Adoption") || "No metric defined",
    value: extractField(output, "Value") || "No metric defined",
    business: extractField(output, "Business") || "No metric defined",
    calibrationNote: extractField(output, "Calibration note") || "",
  };
}

// ─── Shared Extraction Helpers ────────────────────────────────────

/**
 * Extract a labeled field value from agent output.
 * Handles multi-line values up to the next label or separator.
 */
function extractField(output: string, label: string): string | null {
  // Match "Label:" or "Label: " followed by content
  const pattern = new RegExp(
    `${escapeRegex(label)}:\\s*(.+?)(?=\\n(?:[A-Z][a-z]+ ?(?:signal|evidence|edge|note)?:|Verdict:|Competition:|Reason:|Scope|Constraint|Calibration|---)|\$)`,
    "is"
  );
  const match = output.match(pattern);
  if (!match) return null;

  return match[1].trim().replace(/\n+/g, " ");
}

/**
 * Extract verdict (Pursue/Watch/Drop) from agent output.
 */
function extractVerdict(output: string): Verdict {
  const match = output.match(/Verdict:\s*(Pursue|Watch|Drop)/i);
  if (!match) return "watch";
  return match[1].toLowerCase() as Verdict;
}

/**
 * Extract competition level from agent output.
 */
function extractCompetition(output: string): CompetitionLevel {
  const match = output.match(/Competition:\s*(Crowded|White\s*space|Graveyard)/i);
  if (!match) return "white_space";

  const raw = match[1].toLowerCase().replace(/\s+/g, "_");
  if (raw === "crowded") return "crowded";
  if (raw === "graveyard") return "graveyard";
  return "white_space";
}

/**
 * Extract numbered list items from agent output.
 */
function extractNumberedList(output: string, sectionLabel: string): string[] {
  // Find section start
  const sectionPattern = new RegExp(
    `${escapeRegex(sectionLabel)}[^:]*:\\s*\\n((?:\\d+\\.\\s*.+\\n?)+)`,
    "i"
  );
  const match = output.match(sectionPattern);
  if (!match) return [];

  const items: string[] = [];
  const listPattern = /\d+\.\s*(.+)/g;
  let listMatch;
  while ((listMatch = listPattern.exec(match[1])) !== null) {
    const item = listMatch[1].trim();
    if (item) items.push(item);
  }

  return items;
}

/** Escape special regex characters */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Made with Bob
