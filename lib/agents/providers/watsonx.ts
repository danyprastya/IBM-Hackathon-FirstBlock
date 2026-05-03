// SERVER ONLY — Watsonx AI provider implementing AIProvider.
// generateText: single REST call.
// generateWithTools: real tool-calling loop using Watsonx native function calling.
//   The model emits tool_calls, we dispatch via the registry, feed results back
//   as role:"tool" messages, and loop until the model stops or maxSteps.

import type { AIProvider, ToolDefinition } from "../types";

const DEFAULT_MODEL_ID = "ibm/granite-4-h-small";
const DEFAULT_MAX_STEPS = 20;

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

interface WatsonxChoice {
  message: {
    role: "assistant";
    content: string;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
  };
  finish_reason?: string;
}

interface WatsonxResponse {
  choices?: WatsonxChoice[];
  error?: { message: string };
}

export class WatsonxProvider implements AIProvider {
  private cachedToken?: { value: string; expiresAt: number };

  private async getIAMToken(): Promise<string> {
    // Token TTL is ~1 hr; cache it modestly to avoid hammering IAM on each call.
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.value;
    }

    const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${process.env.WATSONX_API_KEY}`,
    });
    if (!res.ok) throw new Error(`Failed to get IAM token: ${res.status}`);
    const { access_token, expires_in } = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.cachedToken = {
      value: access_token,
      expiresAt: now + expires_in * 1000,
    };
    return access_token;
  }

  private modelId(): string {
    return process.env.WATSONX_MODEL_ID || DEFAULT_MODEL_ID;
  }

  private async callWatsonxAPI(
    messages: ChatMessage[],
    options: {
      maxTokens?: number;
      temperature?: number;
      tools?: Array<{
        type: "function";
        function: { name: string; description: string; parameters: object };
      }>;
    }
  ): Promise<WatsonxChoice> {
    const token = await this.getIAMToken();

    const body: Record<string, unknown> = {
      model_id: this.modelId(),
      project_id: process.env.WATSONX_PROJECT_ID,
      messages,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
    };
    if (options.tools?.length) {
      body.tools = options.tools;
      body.tool_choice_option = "auto";
    }

    const res = await fetch(
      `${process.env.WATSONX_API_URL}/ml/v1/text/chat?version=2024-05-31`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Watsonx API error: ${res.status} - ${errorText}`);
    }

    const data: WatsonxResponse = await res.json();
    if (data.error) throw new Error(data.error.message);
    if (!data.choices?.length) throw new Error("No response from Watsonx");

    return data.choices[0];
  }

  async generateText(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string> {
    const all: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
    const choice = await this.callWatsonxAPI(all, options);
    return choice.message.content ?? "";
  }

  async generateWithTools(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    tools: ToolDefinition[],
    options: { maxTokens?: number; temperature?: number; maxSteps?: number } = {}
  ): Promise<string> {
    const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
    const watsonxTools = tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const conversation: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let lastAssistantText = "";

    for (let step = 0; step < maxSteps; step++) {
      const choice = await this.callWatsonxAPI(conversation, {
        ...options,
        tools: watsonxTools,
      });
      const message = choice.message;
      lastAssistantText = message.content ?? lastAssistantText;

      const toolCalls = message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return message.content ?? "";
      }

      // Echo the assistant's tool_calls into the conversation.
      conversation.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: toolCalls,
      });

      // Dispatch each tool call in parallel; preserve order.
      const toolResults = await Promise.all(
        toolCalls.map(async (call) => {
          const tool = tools.find((t) => t.name === call.function.name);
          if (!tool) {
            return {
              tool_call_id: call.id,
              content: JSON.stringify({ error: `unknown_tool:${call.function.name}` }),
            };
          }
          let parsedArgs: Record<string, unknown>;
          try {
            parsedArgs = JSON.parse(call.function.arguments || "{}");
          } catch {
            return {
              tool_call_id: call.id,
              content: JSON.stringify({ error: "invalid_arguments_json" }),
            };
          }
          try {
            const result = await tool.execute(parsedArgs);
            return { tool_call_id: call.id, content: result };
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
              tool_call_id: call.id,
              content: JSON.stringify({ error: message }),
            };
          }
        })
      );

      for (const r of toolResults) {
        conversation.push({
          role: "tool",
          tool_call_id: r.tool_call_id,
          content: r.content,
        });
      }
    }

    // Hit step ceiling. Force the model to produce a final answer using what it has.
    conversation.push({
      role: "user",
      content:
        "You have hit the tool-call limit. Produce your final answer now using only " +
        "the information already gathered. Do not call any more tools.",
    });
    const final = await this.callWatsonxAPI(conversation, options);
    return final.message.content ?? lastAssistantText;
  }
}

// Made with Bob
