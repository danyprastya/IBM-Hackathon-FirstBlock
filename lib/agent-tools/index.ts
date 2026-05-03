// Tool registry. Add new tools here + export the array(s) agents consume.

import type { ToolDefinition } from "@/lib/agents/types";
import { WebSearch } from "./web-search";
import { Fetch } from "./fetch";

export { WebSearch, Fetch };

/** Default tool set for research-style agents (ProblemResearch, SolutionGenerator, SolutionResearch). */
export const SEARCH_TOOLS: ToolDefinition[] = [WebSearch, Fetch];

// Made with Bob
