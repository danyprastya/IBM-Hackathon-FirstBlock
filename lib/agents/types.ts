// Agent system type definitions
// Core types for multi-agent orchestration

import type { OnboardingData } from "@/lib/firebase/collections";

// ─── Agent Types ──────────────────────────────────────────────────

export type AgentType =
  | "ContextCompactor"
  | "ProblemResearch"
  | "SolutionGenerator"
  | "SolutionResearch"
  | "Scope"
  | "Metrics"
  | "PRDWriter"
  | "Phase";

export type StageType = "discover" | "define" | "develop" | "scope" | "deliver";

// ─── Agent Configuration ──────────────────────────────────────────

export interface AgentConfig {
  type: AgentType;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  /** Whether this agent needs search tools */
  needsTools: boolean;
}

// ─── Execution Context ────────────────────────────────────────────

export interface AgentExecutionContext {
  userId: string;
  stage: StageType;
  /** Compacted upstream context from previous stage */
  upstreamContext?: string;
  /** Founder onboarding profile */
  founderProfile?: OnboardingData;
  /** Agent-specific inputs — varies by agent type */
  specificInputs: Record<string, unknown>;
}

// ─── Agent Results ────────────────────────────────────────────────

export interface AgentResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: {
    agentType: AgentType;
    timestamp: string;
    /** Duration in ms */
    duration?: number;
    /** Token usage if available */
    tokensUsed?: number;
  };
}

// ─── Tool Interfaces ──────────────────────────────────────────────
// Stubs for search tools — teammate fills in real implementations

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ToolCallResult {
  toolName: string;
  results: SearchResult[];
  query: string;
}

/**
 * Interface for search tools used by research agents.
 * Teammate implements real versions — these are the contracts.
 */
export interface SearchToolProvider {
  /**
   * Quick keyword search against live web.
   * Best for: news, market data, funding, competitor names.
   */
  webSearch(query: string): Promise<SearchResult[]>;

  /**
   * Deep structured research on a topic.
   * Best for: industry analysis, competitive landscapes, tech complexity.
   */
  research(query: string): Promise<SearchResult[]>;
}

// ─── AI Provider Interface ────────────────────────────────────────
// Abstracts LLM call — supports both Watsonx REST and AI SDK

export interface AIProvider {
  /**
   * Generate text from messages + system prompt.
   * No tools — pure text generation.
   */
  generateText(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string>;

  /**
   * Generate text with tool access.
   * Used by research agents that need webSearch/research tools.
   * Returns final text after all tool calls resolved.
   */
  generateWithTools(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    tools: SearchToolProvider,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string>;
}

// ─── Stage Agent Map ──────────────────────────────────────────────

export const STAGE_AGENTS: Record<StageType, AgentType[]> = {
  discover: [], // No agents — just collection
  define: ["ContextCompactor", "ProblemResearch"],
  develop: ["ContextCompactor", "SolutionGenerator", "SolutionResearch"],
  scope: ["ContextCompactor", "Scope", "Metrics"],
  deliver: ["ContextCompactor", "PRDWriter", "Phase"],
};

// ─── Agent Config Defaults ────────────────────────────────────────

export const AGENT_DEFAULTS: Record<AgentType, Omit<AgentConfig, "systemPrompt">> = {
  ContextCompactor: { type: "ContextCompactor", maxTokens: 500, temperature: 0.3, needsTools: false },
  ProblemResearch: { type: "ProblemResearch", maxTokens: 1500, temperature: 0.5, needsTools: true },
  SolutionGenerator: { type: "SolutionGenerator", maxTokens: 800, temperature: 0.5, needsTools: true },
  SolutionResearch: { type: "SolutionResearch", maxTokens: 1500, temperature: 0.5, needsTools: true },
  Scope: { type: "Scope", maxTokens: 800, temperature: 0.4, needsTools: false },
  Metrics: { type: "Metrics", maxTokens: 600, temperature: 0.4, needsTools: false },
  PRDWriter: { type: "PRDWriter", maxTokens: 3000, temperature: 0.3, needsTools: false },
  Phase: { type: "Phase", maxTokens: 1000, temperature: 0.4, needsTools: false },
};

// Made with Bob
