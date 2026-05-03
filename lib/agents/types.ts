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

// ─── Tool Definitions ─────────────────────────────────────────────
// One ToolDefinition per callable tool. Sent to Watsonx as the `tools`
// parameter; the model emits tool_calls, the executor dispatches by name.

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON schema for the function's arguments. */
  parameters: object;
  /** Run the tool. Args are the parsed JSON the model emitted. Return string content for the tool message. */
  execute: (args: Record<string, unknown>) => Promise<string>;
}

// ─── AI Provider Interface ────────────────────────────────────────

export interface AIProvider {
  /** Pure text generation — no tools. */
  generateText(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string>;

  /**
   * Tool-enabled generation. Real round-trip: model emits tool_calls,
   * the provider dispatches via the registry, feeds results back as
   * role:"tool" messages, and loops until the model stops or maxSteps.
   */
  generateWithTools(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    tools: ToolDefinition[],
    options?: { maxTokens?: number; temperature?: number; maxSteps?: number }
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
