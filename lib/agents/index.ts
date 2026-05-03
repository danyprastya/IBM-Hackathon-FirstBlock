// Agent system barrel export
// Import from "@/lib/agents" for all agent functionality

export { AgentRouter } from "./router";
export { AgentExecutor, setAIProvider } from "./executor";
export { AGENT_PROMPTS, UPSTREAM_CONTEXT_TEMPLATE } from "./prompts";
export { WatsonxProvider } from "./providers/watsonx";
export {
  parseProblemBrief,
  parseSolutionBrief,
  parseSolutionDirections,
  parseScope,
  parseMetrics,
} from "./parsers";

export type {
  AgentType,
  StageType,
  AgentConfig,
  AgentExecutionContext,
  AgentResult,
  AIProvider,
  ToolDefinition,
} from "./types";

export { STAGE_AGENTS, AGENT_DEFAULTS } from "./types";

// Made with Bob
