// Agent system barrel export
// Import from "@/lib/agents" for all agent functionality

export { AgentRouter } from "./router";
export { AgentExecutor, setAIProvider, setSearchProvider } from "./executor";
export { AGENT_PROMPTS, UPSTREAM_CONTEXT_TEMPLATE } from "./prompts";
export { StubSearchProvider } from "./tools";
export { WatsonxProvider } from "./providers/watsonx";

export type {
  AgentType,
  StageType,
  AgentConfig,
  AgentExecutionContext,
  AgentResult,
  AIProvider,
  SearchToolProvider,
  SearchResult,
  ToolCallResult,
} from "./types";

export { STAGE_AGENTS, AGENT_DEFAULTS } from "./types";

// Made with Bob
