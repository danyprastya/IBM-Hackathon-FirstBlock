// Agent routing logic
// Detects stage from user state + routes to appropriate agent workflow

import type { AgentType, StageType, AgentConfig, AgentExecutionContext } from "./types";
import { AGENT_DEFAULTS, STAGE_AGENTS } from "./types";
import { AGENT_PROMPTS } from "./prompts";
import { AgentExecutor } from "./executor";

// ─── Router ───────────────────────────────────────────────────────

export class AgentRouter {
  /**
   * Get full agent config with system prompt for a given agent type.
   */
  static getConfig(type: AgentType): AgentConfig {
    return {
      ...AGENT_DEFAULTS[type],
      systemPrompt: AGENT_PROMPTS[type],
    };
  }

  /**
   * Get all agent types for a given stage.
   */
  static getAgentsForStage(stage: StageType): AgentType[] {
    return STAGE_AGENTS[stage];
  }

  /**
   * Run ContextCompactor on upstream output.
   * Called between every stage transition.
   */
  static async compact(
    upstreamOutput: string,
    stage: StageType,
    userId: string
  ) {
    const config = this.getConfig("ContextCompactor");
    const context: AgentExecutionContext = {
      userId,
      stage,
      specificInputs: { upstreamOutput },
    };

    return AgentExecutor.execute(config, context);
  }

  /**
   * Run ProblemResearch agents in parallel — one per problem.
   * `rawInput` is the founder's verbatim text. The agent reads it as the
   * "Problem statement" labeled section in its user message.
   */
  static async researchProblems(
    problems: Array<{ id: string; rawInput: string }>,
    founderProfile: AgentExecutionContext["founderProfile"],
    upstreamContext: string | undefined,
    userId: string
  ) {
    const configs = problems.map(() => this.getConfig("ProblemResearch"));
    const contexts: AgentExecutionContext[] = problems.map((p) => ({
      userId,
      stage: "define" as const,
      upstreamContext,
      founderProfile,
      specificInputs: {
        problemStatement: p.rawInput,
        problemId: p.id,
      },
    }));

    return AgentExecutor.executeParallel(configs, contexts);
  }

  /**
   * Run SolutionGenerator once — decides N and generates directions.
   */
  static async generateSolutions(
    chosenProblem: string,
    compactedContext: string,
    founderProfile: AgentExecutionContext["founderProfile"],
    userId: string
  ) {
    const config = this.getConfig("SolutionGenerator");
    const context: AgentExecutionContext = {
      userId,
      stage: "develop",
      upstreamContext: compactedContext,
      founderProfile,
      specificInputs: {
        chosenProblem,
      },
    };

    return AgentExecutor.execute(config, context);
  }

  /**
   * Run SolutionResearch agents in parallel — one per direction.
   */
  static async researchSolutions(
    solutions: Array<{ id: string; direction: string }>,
    chosenProblem: string,
    compactedContext: string,
    founderProfile: AgentExecutionContext["founderProfile"],
    userId: string
  ) {
    const configs = solutions.map(() => this.getConfig("SolutionResearch"));
    const contexts: AgentExecutionContext[] = solutions.map((s) => ({
      userId,
      stage: "develop" as const,
      upstreamContext: compactedContext,
      founderProfile,
      specificInputs: {
        solutionDirection: s.direction,
        solutionId: s.id,
        chosenProblem,
      },
    }));

    return AgentExecutor.executeParallel(configs, contexts);
  }

  /**
   * Run Scope + Metrics agents in parallel.
   */
  static async defineScopeAndMetrics(
    chosenSolution: string,
    chosenProblem: string,
    compactedContext: string,
    founderProfile: AgentExecutionContext["founderProfile"],
    userId: string
  ) {
    const scopeConfig = this.getConfig("Scope");
    const metricsConfig = this.getConfig("Metrics");

    const baseContext = {
      userId,
      stage: "scope" as const,
      upstreamContext: compactedContext,
      founderProfile,
      specificInputs: {
        chosenSolution,
        chosenProblem,
      },
    };

    return AgentExecutor.executeParallel(
      [scopeConfig, metricsConfig],
      [baseContext, { ...baseContext }]
    );
  }

  /**
   * Run PRDWriter once.
   */
  static async writePRD(
    problemBrief: string,
    solutionBrief: string,
    scopeIn: string[],
    scopeOut: string[],
    metrics: { adoption: string; value: string; business: string },
    compactedContext: string,
    founderEdits: { mvp?: string; metrics?: Record<string, string> },
    userId: string
  ) {
    const config = this.getConfig("PRDWriter");
    const context: AgentExecutionContext = {
      userId,
      stage: "deliver",
      upstreamContext: compactedContext,
      specificInputs: {
        problemBrief,
        solutionBrief,
        scopeIn,
        scopeOut,
        metrics: JSON.stringify(metrics),
        founderEdits: JSON.stringify(founderEdits),
      },
    };

    return AgentExecutor.execute(config, context);
  }

  /**
   * Run PhaseAgent sequentially — v1, v2, ..., complete.
   */
  static async writePhases(
    versions: string[],
    fullPrd: string,
    compactedContext: string,
    founderProfile: AgentExecutionContext["founderProfile"],
    userId: string
  ) {
    const configs = versions.map(() => this.getConfig("Phase"));
    const contexts: AgentExecutionContext[] = versions.map((version, i) => ({
      userId,
      stage: "deliver" as const,
      upstreamContext: compactedContext,
      founderProfile,
      specificInputs: {
        fullPrd,
        version,
        order: i + 1,
      },
    }));

    return AgentExecutor.executeSequential(configs, contexts);
  }
}

// Made with Bob
