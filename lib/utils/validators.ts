// Zod validation schemas for all API routes
import { z } from "zod";

// ─── Existing schemas (unchanged) ─────────────────────────────────

// Onboarding form validation
export const onboardingSchema = z.object({
  location: z.string().min(1, "Location is required").max(100),
  experience: z.enum(["never", "tried", "running"]),
  capital: z.enum(["<500", "500-2000", "2000-10000", "10000+"]),
  skills: z.array(z.string()).min(1, "Select at least one skill"),
  interests: z.array(z.string()).min(1, "Select at least one interest"),
  hoursPerWeek: z.enum(["<10", "10-20", "20-40", "fulltime"]),
  concern: z.string().min(1, "Please share your main concern").max(500),
  goal: z.string().min(1, "Please share your 1-year goal").max(500),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

// Chat message validation
export const chatMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message too long (max 2000 characters)"),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

// Sticky note validation
export const stickyNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(500, "Content too long (max 500 characters)"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format"),
});

export type StickyNoteInput = z.infer<typeof stickyNoteSchema>;

// Sticky note update validation
export const stickyNoteUpdateSchema = z.object({
  id: z.string().min(1, "Sticky note ID is required"),
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(500, "Content too long (max 500 characters)")
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format")
    .optional(),
});

export type StickyNoteUpdateInput = z.infer<typeof stickyNoteUpdateSchema>;

// Sticky note delete validation
export const stickyNoteDeleteSchema = z.object({
  id: z.string().min(1, "Sticky note ID is required"),
});

export type StickyNoteDeleteInput = z.infer<typeof stickyNoteDeleteSchema>;

// ─── Double Diamond schemas ───────────────────────────────────────

// Shared enums
const verdictEnum = z.enum(["pursue", "watch", "drop"]);
const competitionEnum = z.enum(["crowded", "white_space", "graveyard"]);
const agentStatusEnum = z.enum(["running", "complete", "failed"]);

// Problem input (Discover stage)
export const problemInputSchema = z.object({
  rawInput: z
    .string()
    .min(1, "Problem description is required")
    .max(2000, "Problem too long (max 2000 characters)"),
  inputType: z.enum(["text", "voice"]).default("text"),
});

export type ProblemInput = z.infer<typeof problemInputSchema>;

// Research brief (from ProblemResearchAgent output)
export const researchBriefSchema = z.object({
  marketSignal: z.string().min(1).max(1000),
  painEvidence: z.string().min(1).max(1000),
  competition: competitionEnum,
  competitionNote: z.string().min(1).max(500),
  aiVerdict: verdictEnum,
  aiReason: z.string().min(1).max(500),
});

export type ResearchBriefInput = z.infer<typeof researchBriefSchema>;

// Founder decision at any gate
export const founderDecisionSchema = z.object({
  verdict: verdictEnum,
  reason: z.string().max(500).optional(),
});

export type FounderDecisionInput = z.infer<typeof founderDecisionSchema>;

// Solution direction (from SolutionGeneratorAgent)
export const solutionDirectionSchema = z.object({
  direction: z
    .string()
    .min(1, "Solution direction is required")
    .max(500, "Direction too long"),
});

export type SolutionDirectionInput = z.infer<typeof solutionDirectionSchema>;

// Solution brief (from SolutionResearchAgent output)
export const solutionBriefSchema = z.object({
  feasibility: z.string().min(1).max(1000),
  differentiation: z.string().min(1).max(1000),
  founderEdge: z.string().min(1).max(500),
  aiVerdict: verdictEnum,
  aiReason: z.string().min(1).max(500),
});

export type SolutionBriefInput = z.infer<typeof solutionBriefSchema>;

// MVP scope (from ScopeAgent output)
export const mvpScopeSchema = z.object({
  scopeIn: z
    .array(z.string().min(1).max(300))
    .min(1, "At least one scope item required")
    .max(7),
  scopeOut: z
    .array(z.string().min(1).max(300))
    .min(1, "At least one deferred item required")
    .max(10),
});

export type MVPScopeInput = z.infer<typeof mvpScopeSchema>;

// MVP founder confirmation
export const mvpConfirmSchema = z.object({
  confirmed: z.boolean(),
  edits: z.string().max(1000).optional(),
});

export type MVPConfirmInput = z.infer<typeof mvpConfirmSchema>;

// Success metrics (from MetricsAgent output)
export const successMetricsSchema = z.object({
  metrics: z.object({
    adoption: z.string().min(1).max(500),
    value: z.string().min(1).max(500),
    business: z.string().min(1).max(500),
  }),
});

export type SuccessMetricsInput = z.infer<typeof successMetricsSchema>;

// Metrics founder confirmation
export const metricsConfirmSchema = z.object({
  confirmed: z.boolean(),
  edits: z.object({
    adoption: z.string().max(500).optional(),
    value: z.string().max(500).optional(),
    business: z.string().max(500).optional(),
  }).optional(),
});

export type MetricsConfirmInput = z.infer<typeof metricsConfirmSchema>;

// PRD (from PRDWriterAgent output)
export const prdSchema = z.object({
  fullPrd: z.string().min(1).max(50000),
  mvpRef: z.string().min(1),
  metricsRef: z.string().min(1),
});

export type PRDInput = z.infer<typeof prdSchema>;

// Phase (from PhaseAgent output)
export const phaseSchema = z.object({
  version: z.string().min(1).max(20),
  order: z.number().int().min(1),
  content: z.string().min(1).max(20000),
});

export type PhaseInput = z.infer<typeof phaseSchema>;

// ─── Agent API request schemas ────────────────────────────────────

// Context compaction request
export const compactRequestSchema = z.object({
  upstreamOutput: z.string().min(1).max(50000),
  stage: z.enum(["discover", "define", "develop", "scope", "deliver"]),
});

export type CompactRequestInput = z.infer<typeof compactRequestSchema>;

// Problem research request
export const problemResearchRequestSchema = z.object({
  problemId: z.string().min(1),
  problemStatement: z.string().min(1).max(2000),
});

export type ProblemResearchRequestInput = z.infer<typeof problemResearchRequestSchema>;

// Solution generation request
export const solutionGenerateRequestSchema = z.object({
  problemId: z.string().min(1),
  researchId: z.string().min(1),
});

export type SolutionGenerateRequestInput = z.infer<typeof solutionGenerateRequestSchema>;

// Solution research request
export const solutionResearchRequestSchema = z.object({
  problemId: z.string().min(1),
  researchId: z.string().min(1),
  solutionCollectionId: z.string().min(1),
  solutionId: z.string().min(1),
  direction: z.string().min(1).max(500),
});

export type SolutionResearchRequestInput = z.infer<typeof solutionResearchRequestSchema>;

// Scope definition request
export const scopeRequestSchema = z.object({
  problemId: z.string().min(1),
  researchId: z.string().min(1),
  solutionCollectionId: z.string().min(1),
  solutionId: z.string().min(1),
});

export type ScopeRequestInput = z.infer<typeof scopeRequestSchema>;

// Metrics definition request (same path params as scope)
export const metricsRequestSchema = scopeRequestSchema;
export type MetricsRequestInput = ScopeRequestInput;

// PRD write request
export const prdWriteRequestSchema = z.object({
  problemId: z.string().min(1),
  researchId: z.string().min(1),
  solutionCollectionId: z.string().min(1),
  solutionId: z.string().min(1),
  mvpId: z.string().min(1),
  metricsId: z.string().min(1),
});

export type PRDWriteRequestInput = z.infer<typeof prdWriteRequestSchema>;

// Phase write request
export const phaseWriteRequestSchema = z.object({
  problemId: z.string().min(1),
  researchId: z.string().min(1),
  solutionCollectionId: z.string().min(1),
  solutionId: z.string().min(1),
  prdId: z.string().min(1),
  version: z.string().min(1).max(20),
});

export type PhaseWriteRequestInput = z.infer<typeof phaseWriteRequestSchema>;

// Gate decision request (used at Define and Develop gates)
export const gateDecisionRequestSchema = z.object({
  problemId: z.string().min(1),
  researchId: z.string().min(1).optional(),
  solutionCollectionId: z.string().min(1).optional(),
  solutionId: z.string().min(1).optional(),
  decision: founderDecisionSchema,
});

export type GateDecisionRequestInput = z.infer<typeof gateDecisionRequestSchema>;

// Made with Bob
