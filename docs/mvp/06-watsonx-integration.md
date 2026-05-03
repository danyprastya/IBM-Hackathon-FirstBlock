# 06 — Watsonx Integration

> **Status note:** The actual code in `lib/watsonx/client.ts` and `lib/agents/providers/watsonx.ts` currently calls Watsonx via direct REST + a hand-rolled `WatsonxProvider implements AIProvider`. The "tool calling" path simulates tool use via prompt injection (no real `tool_calls` round-trip). This doc describes the **target** state — a real `LanguageModelV3` provider for the Vercel AI SDK. The migration brief is `docs/execute/02-watsonx-ai-sdk-migration.md`. After it lands, the provider, model accessor, and agent functions in this doc are what's running.

The provider implements `LanguageModelV3` with full tool support: `tool_calls` parsed from the model response, `role: "tool"` messages mapped, finish reason properly handled.

## Lift wholesale

`lib/watsonx/client.ts` — copy from `prototype/lib/watsonx/client.ts` unchanged. It's already correct.

```ts
import { WatsonXAI } from "@ibm-cloud/watsonx-ai";

let cached: WatsonXAI | undefined;

export const getWatsonxClient = (): WatsonXAI => {
  if (!cached) {
    cached = WatsonXAI.newInstance({
      version: "2024-05-31",
      serviceUrl: process.env.WATSONX_AI_SERVICE_URL,
    });
  }
  return cached;
};

export const getWatsonxProjectId = (): string | undefined =>
  process.env.WATSONX_AI_PROJECT_ID;
```

## Patched provider

`lib/watsonx/provider.ts` — replace prototype version with this. Changes from prototype: tool params passed through, `tool_calls` parsed from response, `role: "tool"` messages mapped, finish reason properly handled.

```ts
import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3FinishReason,
  LanguageModelV3FunctionTool,
  LanguageModelV3Message,
  LanguageModelV3StreamPart,
  LanguageModelV3ToolChoice,
  LanguageModelV3Usage,
} from "@ai-sdk/provider";
import type { TextChatMessages, TextChatUsage } from "@ibm-cloud/watsonx-ai";
import { getWatsonxClient, getWatsonxProjectId } from "./client";

// --- helpers ---

const flattenText = (
  parts: Extract<LanguageModelV3Message, { role: "user" | "assistant" }>["content"]
): string =>
  parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("");

const flattenAssistantToolCalls = (
  parts: Extract<LanguageModelV3Message, { role: "assistant" }>["content"]
) =>
  parts
    .filter((p): p is Extract<typeof p, { type: "tool-call" }> => p.type === "tool-call")
    .map((p) => ({
      id: p.toolCallId,
      type: "function" as const,
      function: {
        name: p.toolName,
        arguments: typeof p.input === "string" ? p.input : JSON.stringify(p.input),
      },
    }));

const mapMessages = (prompt: LanguageModelV3CallOptions["prompt"]): TextChatMessages[] =>
  prompt.flatMap((m): TextChatMessages[] => {
    switch (m.role) {
      case "system":
        return [{ role: "system", content: m.content }];
      case "user":
        return [{ role: "user", content: flattenText(m.content) }];
      case "assistant": {
        const text = flattenText(m.content);
        const toolCalls = flattenAssistantToolCalls(m.content);
        // IBM SDK accepts content + tool_calls together
        return [
          {
            role: "assistant",
            content: text,
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          } as TextChatMessages,
        ];
      }
      case "tool":
        // Each tool message is one function-result. ai SDK groups multiple in `m.content`.
        return m.content.map(
          (r) =>
            ({
              role: "tool",
              tool_call_id: r.toolCallId,
              content:
                typeof r.output === "string"
                  ? r.output
                  : JSON.stringify(r.output),
            } as TextChatMessages)
        );
    }
  });

const mapTools = (
  tools: readonly LanguageModelV3FunctionTool[] | undefined
) =>
  tools?.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));

const mapToolChoice = (choice: LanguageModelV3ToolChoice | undefined) => {
  if (!choice) return undefined;
  if (choice.type === "auto") return "auto";
  if (choice.type === "none") return "none";
  if (choice.type === "required") return "required";
  if (choice.type === "tool") {
    return { type: "function", function: { name: choice.toolName } };
  }
  return undefined;
};

const mapFinishReason = (raw: string | undefined | null): LanguageModelV3FinishReason => {
  const unified =
    raw === "stop" ? "stop"
    : raw === "length" ? "length"
    : raw === "tool_calls" ? "tool-calls"
    : raw === "error" ? "error"
    : "other";
  return { unified, raw: raw ?? undefined };
};

const mapUsage = (u: TextChatUsage | undefined): LanguageModelV3Usage => ({
  inputTokens: {
    total: u?.prompt_tokens,
    noCache: u?.prompt_tokens,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: u?.completion_tokens,
    text: u?.completion_tokens,
    reasoning: undefined,
  },
});

// --- model class ---

class WatsonxChatModel implements LanguageModelV3 {
  readonly specificationVersion = "v3" as const;
  readonly provider = "watsonx";
  readonly supportedUrls = {};

  constructor(public readonly modelId: string) {}

  async doGenerate(options: LanguageModelV3CallOptions) {
    const tools = mapTools(options.tools as readonly LanguageModelV3FunctionTool[] | undefined);
    const toolChoice = mapToolChoice(options.toolChoice);

    const res = await getWatsonxClient().textChat({
      modelId: this.modelId,
      projectId: getWatsonxProjectId(),
      messages: mapMessages(options.prompt),
      maxTokens: options.maxOutputTokens,
      temperature: options.temperature,
      topP: options.topP,
      stop: options.stopSequences,
      seed: options.seed,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      ...(tools ? { tools } : {}),
      ...(toolChoice ? { toolChoice } : {}),
    } as Parameters<typeof getWatsonxClient>["arguments"] extends never ? never : never);
    // ^ The IBM SDK's TextChatParams type may not list tools; cast at the call site if TS complains.

    const choice = res.result.choices?.[0];
    const message = choice?.message;
    const text = message?.content ?? "";
    const rawToolCalls = (message as { tool_calls?: Array<{
      id: string;
      type?: "function";
      function: { name: string; arguments: string };
    }> })?.tool_calls;

    const content: LanguageModelV3Message["content"] = [];
    if (text) content.push({ type: "text", text });
    if (rawToolCalls?.length) {
      for (const tc of rawToolCalls) {
        let parsed: unknown;
        try { parsed = JSON.parse(tc.function.arguments); } catch { parsed = tc.function.arguments; }
        content.push({
          type: "tool-call",
          toolCallId: tc.id,
          toolName: tc.function.name,
          input: parsed,
        });
      }
    }

    return {
      content,
      finishReason: mapFinishReason(choice?.finish_reason),
      usage: mapUsage(res.result.usage),
      warnings: [],
      response: { id: res.result.id, modelId: res.result.model_id },
    };
  }

  async doStream(options: LanguageModelV3CallOptions) {
    // Streaming not used in MVP; non-tool-call streaming kept for potential future use.
    const watsonxStream = await getWatsonxClient().textChatStream({
      modelId: this.modelId,
      projectId: getWatsonxProjectId(),
      messages: mapMessages(options.prompt),
      maxTokens: options.maxOutputTokens,
      temperature: options.temperature,
      topP: options.topP,
      stop: options.stopSequences,
      seed: options.seed,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      returnObject: true,
    });

    const textId = "0";
    let finishReason: LanguageModelV3FinishReason = { unified: "other", raw: undefined };
    let usage: LanguageModelV3Usage = mapUsage(undefined);

    const stream = new ReadableStream<LanguageModelV3StreamPart>({
      async start(controller) {
        try {
          controller.enqueue({ type: "stream-start", warnings: [] });
          controller.enqueue({ type: "text-start", id: textId });
          for await (const chunk of watsonxStream) {
            const data = chunk.data;
            const choice = data.choices?.[0];
            const delta = choice?.delta?.content;
            if (delta) controller.enqueue({ type: "text-delta", id: textId, delta });
            if (choice?.finish_reason) finishReason = mapFinishReason(choice.finish_reason);
            if (data.usage) usage = mapUsage(data.usage);
          }
          controller.enqueue({ type: "text-end", id: textId });
          controller.enqueue({ type: "finish", finishReason, usage });
          controller.close();
        } catch (e) {
          controller.enqueue({ type: "error", error: e });
          controller.close();
        }
      },
    });

    return { stream };
  }
}

export const watsonx = (modelId: string): LanguageModelV3 => new WatsonxChatModel(modelId);
```

If the IBM SDK's `TextChatParams` type lacks `tools`/`toolChoice` (it varies by version), use a focused `as` cast on the params object: `(params as Parameters<typeof client.textChat>[0] & { tools?: unknown; toolChoice?: unknown })`. The Watsonx HTTP API accepts these fields on Granite chat models — TypeScript is just behind on the types.

## Single-model accessor

`lib/watsonx/model.ts`:

```ts
import { watsonx } from "./provider";

const modelId = process.env.WATSONX_MODEL_ID;
if (!modelId) throw new Error("WATSONX_MODEL_ID env var is required");

export const model = watsonx(modelId);
```

Every agent imports `model` from here. No factory, no per-stage variants.

## Generation patterns

Two patterns cover all seven agents.

### Pattern A — structured output, no tools

For: `clean-problem`, `scope`, `metrics`, `phases`. Use `generateObject`:

```ts
import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/watsonx/model";

const schema = z.object({ cleanedStatement: z.string().max(220) });

export async function runCleanProblemAgent(rawInput: string): Promise<{ cleanedStatement: string }> {
  const { object } = await generateObject({
    model,
    schema,
    system: "Rewrite raw founder input as one crisp problem statement: who suffers, what blocks them, why now. ≤200 chars. No marketing language, no solution hints, no questions.",
    prompt: `Raw input:\n${rawInput}`,
    temperature: 0.2,
    maxOutputTokens: 300,
  });
  return object;
}
```

### Pattern B — tool calling, then final structured output

For: `research`, `solutions`. Use `generateText({tools, maxSteps})`, then a final `generateObject` to extract structured output from the conversation. This pattern (a) lets the model call tools freely without strict-output pressure, (b) guarantees a parseable final answer.

```ts
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/watsonx/model";
import { tools } from "@/lib/agent-tools";

const briefSchema = z.object({
  marketSignal: z.string(),
  painEvidence: z.string(),
  competition: z.enum(["crowded", "white_space", "graveyard"]),
  competitionNote: z.string(),
  aiVerdict: z.enum(["pursue", "watch", "drop"]),
  aiReason: z.string(),
});

export async function runResearchAgent(input: {
  problemStatement: string;
  founderInput: string;
  priorLabel?: string;
  maxDurationMs: number;
}) {
  const startedAt = Date.now();
  const remaining = () => Math.max(0, input.maxDurationMs - (Date.now() - startedAt));

  const system = buildResearchSystemPrompt(input);
  const userMsg = buildResearchUserPrompt(input);

  const { response } = await generateText({
    model,
    tools, // see 07-agent-tools.md
    maxSteps: Number(process.env.AGENT_MAX_STEPS ?? 50),
    system: () => `${system}\n\nRemaining time: ~${Math.round(remaining()/1000)}s. Pace yourself.`,
    messages: [{ role: "user", content: userMsg }],
    temperature: 0.4,
    maxOutputTokens: 2000,
    abortSignal: AbortSignal.timeout(input.maxDurationMs),
    // The ai SDK runs the loop; provider returns tool-call content, SDK executes tool, loops.
  });

  // After the loop, extract the final ProblemBrief.
  // We re-run generateObject over the conversation so we get a guaranteed-parseable JSON.
  const { object } = await generateObject({
    model,
    schema: briefSchema,
    messages: [
      ...response.messages,
      {
        role: "user",
        content:
          "Based on your research above, return the final ProblemBrief now as strict JSON. " +
          "No prose, no commentary.",
      },
    ],
    temperature: 0.2,
    maxOutputTokens: 1000,
  });

  return object;
}

function buildResearchSystemPrompt(_: {
  problemStatement: string; founderInput: string; priorLabel?: string;
}): string {
  // See 08-agent-prompts.md
  return /* big prompt string */ "";
}
function buildResearchUserPrompt(_: {
  problemStatement: string; founderInput: string; priorLabel?: string;
}): string {
  // See 08-agent-prompts.md
  return "";
}
```

The two `generateXxx` calls reuse the same model — no separate cheap/expensive split.

## Anti-loop watchdog

The `ai` SDK exposes `onStepFinish` for per-step inspection. Wrap `generateText` with watchdog logic that aborts if the same `(toolName, args)` repeats 3 times in a row.

`lib/agents/watchdog.ts`:

```ts
import type { LanguageModelV3FunctionTool } from "@ai-sdk/provider";

export function createWatchdog() {
  const recent: string[] = [];
  let aborted = false;

  return {
    aborted: () => aborted,
    onStepFinish: ({ toolCalls }: { toolCalls?: Array<{ toolName: string; input: unknown }> }) => {
      for (const call of toolCalls ?? []) {
        const key = `${call.toolName}:${JSON.stringify(call.input)}`;
        recent.push(key);
        if (recent.length > 4) recent.shift();
        if (recent.length === 3 && recent.every((x) => x === key)) {
          aborted = true;
        }
      }
    },
  };
}
```

In the research agent, pass `onStepFinish: watchdog.onStepFinish` to `generateText`. After the call, if `watchdog.aborted()` is true, the prompt for the final `generateObject` includes: "You appear to have looped. Produce the final JSON answer now using what you already have, even if incomplete."

## Verifying

1. Smoke-test the patched provider with a minimal tool call (no API route yet):
   ```ts
   import { generateText } from "ai";
   import { model } from "@/lib/watsonx/model";
   import { z } from "zod";
   import { tool } from "ai";

   const echo = tool({
     description: "Echo the input back.",
     inputSchema: z.object({ msg: z.string() }),
     execute: async ({ msg }) => `echoed: ${msg}`,
   });

   const { response } = await generateText({
     model, tools: { echo }, maxSteps: 3,
     prompt: "Use the echo tool with msg='hello' and tell me what it returned.",
   });
   console.log(response.messages);
   ```
2. If you see the assistant emit a `tool-call` for `echo`, the SDK execute it, then a final assistant message — the patched provider works. If you see a TS error around `tools` being passed to `textChat`, add the focused cast suggested above.
3. If `tool_calls` come back empty even though the model "talks about" calling a tool, you may have a Granite model that doesn't support function calling — fall back to one of the alternatives in `01-stack-and-setup.md`.
