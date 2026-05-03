// Agent execution engine
// Drives Watsonx via AIProvider; tool-using agents get the SEARCH_TOOLS
// registry which Watsonx's tool loop will dispatch through.

import type {
  AgentConfig,
  AgentExecutionContext,
  AgentResult,
  AIProvider,
} from "./types";
import { AGENT_PROMPTS, UPSTREAM_CONTEXT_TEMPLATE } from "./prompts";
import { WatsonxProvider } from "./providers/watsonx";
import { SEARCH_TOOLS } from "@/lib/agent-tools";

// ─── Default provider (swappable for tests) ───────────────────────

let aiProvider: AIProvider = new WatsonxProvider();

/** Swap AI provider — useful for tests or future provider migrations. */
export function setAIProvider(provider: AIProvider) {
  aiProvider = provider;
}

// ─── Executor ─────────────────────────────────────────────────────

export class AgentExecutor {
  /**
   * Execute a single agent with given config and context.
   * Automatically selects generateText vs generateWithTools based on config.
   */
  static async execute(
    config: AgentConfig,
    context: AgentExecutionContext
  ): Promise<AgentResult> {
    const start = Date.now();

    try {
      // Build system prompt with upstream context injection
      const systemPrompt = this.buildSystemPrompt(config, context);

      // Build user message from specific inputs
      const messages = this.buildMessages(context);

      let output: string;

      if (config.needsTools) {
        // Research agents — real Watsonx tool-calling loop, max 20 steps.
        output = await aiProvider.generateWithTools(
          systemPrompt,
          messages,
          SEARCH_TOOLS,
          { maxTokens: config.maxTokens, temperature: config.temperature }
        );
      } else {
        // Non-research agents — pure text generation
        output = await aiProvider.generateText(
          systemPrompt,
          messages,
          { maxTokens: config.maxTokens, temperature: config.temperature }
        );
      }

      return {
        success: true,
        output,
        metadata: {
          agentType: config.type,
          timestamp: new Date().toISOString(),
          duration: Date.now() - start,
        },
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[AgentExecutor] ${config.type} failed:`, err.message);

      return {
        success: false,
        output: "",
        error: err.message,
        metadata: {
          agentType: config.type,
          timestamp: new Date().toISOString(),
          duration: Date.now() - start,
        },
      };
    }
  }

  /**
   * Execute multiple agents in parallel.
   * Used for: ProblemResearch × N, SolutionResearch × N, Scope + Metrics
   */
  static async executeParallel(
    configs: AgentConfig[],
    contexts: AgentExecutionContext[]
  ): Promise<AgentResult[]> {
    return Promise.all(
      configs.map((config, i) => this.execute(config, contexts[i]))
    );
  }

  /**
   * Execute multiple agents sequentially.
   * Used for: PhaseAgent v1 → v2 → vN → Complete
   * Each agent receives previous results in context.
   */
  static async executeSequential(
    configs: AgentConfig[],
    contexts: AgentExecutionContext[]
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (let i = 0; i < configs.length; i++) {
      // Inject previous phase results into context
      if (results.length > 0) {
        contexts[i].specificInputs.previousPhases = results
          .filter((r) => r.success)
          .map((r) => r.output)
          .join("\n\n---\n\n");
      }
      const result = await this.execute(configs[i], contexts[i]);
      results.push(result);
    }
    return results;
  }

  /**
   * Build system prompt with upstream context injection.
   */
  private static buildSystemPrompt(
    config: AgentConfig,
    context: AgentExecutionContext
  ): string {
    const basePrompt = AGENT_PROMPTS[config.type];

    // Inject upstream context if available
    if (context.upstreamContext) {
      const contextBlock = UPSTREAM_CONTEXT_TEMPLATE.replace(
        "{{contextCompactorOutput}}",
        context.upstreamContext
      );
      return `${contextBlock}\n\n${basePrompt}`;
    }

    return basePrompt;
  }

  /**
   * Build message array from execution context.
   * Interpolates template variables in the system prompt.
   */
  private static buildMessages(
    context: AgentExecutionContext
  ): Array<{ role: "user" | "assistant" | "system"; content: string }> {
    const inputs = context.specificInputs;
    const profile = context.founderProfile;

    // Build user message from specific inputs
    const parts: string[] = [];

    // Add founder profile if available
    if (profile) {
      parts.push(
        `Founder profile:`,
        `- Location: ${profile.location || "Not specified"}`,
        `- Capital: ${profile.capital || "Not specified"}`,
        `- Skills: ${profile.skills?.join(", ") || "Not specified"}`,
        `- Hours/week: ${profile.hoursPerWeek || "Not specified"}`,
        `- Concern: ${profile.concern || "Not specified"}`,
        `- Goal: ${profile.goal || "Not specified"}`,
        ""
      );
    }

    // Add specific inputs as labeled sections
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === "string") {
        parts.push(`${key}: ${value}`);
      } else if (Array.isArray(value)) {
        parts.push(`${key}:\n${value.map((v, i) => `${i + 1}. ${v}`).join("\n")}`);
      } else if (value && typeof value === "object") {
        parts.push(`${key}: ${JSON.stringify(value)}`);
      }
    }

    return [{ role: "user" as const, content: parts.join("\n") }];
  }
}

// Made with Bob
