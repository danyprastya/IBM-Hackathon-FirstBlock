// Watsonx AI provider — implements AIProvider interface
// Uses existing Watsonx REST client for text generation
// Tool-enabled generation simulates tool calls via prompt injection

import type { AIProvider, SearchToolProvider } from "../types";

interface WatsonxResponse {
  choices?: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

/**
 * Watsonx REST API provider.
 * For pure text generation — calls Watsonx directly.
 * For tool-enabled generation — runs search tools first, injects results into prompt.
 *
 * When AI SDK provider is ready, swap via setAIProvider() in executor.ts
 */
export class WatsonxProvider implements AIProvider {
  private async getIAMToken(): Promise<string> {
    const res = await fetch("https://iam.cloud.ibm.com/identity/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${process.env.WATSONX_API_KEY}`,
    });

    if (!res.ok) throw new Error("Failed to get IAM token");
    const { access_token } = await res.json();
    return access_token;
  }

  private async callWatsonxAPI(
    messages: Array<{ role: string; content: string }>,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    const token = await this.getIAMToken();

    const res = await fetch(
      `${process.env.WATSONX_API_URL}/ml/v1/text/chat?version=2024-05-31`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model_id: "ibm/granite-3-8b-instruct",
          project_id: process.env.WATSONX_PROJECT_ID,
          messages,
          parameters: {
            max_new_tokens: options?.maxTokens ?? 1024,
            temperature: options?.temperature ?? 0.7,
          },
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Watsonx API error: ${res.status} - ${errorText}`);
    }

    const data: WatsonxResponse = await res.json();

    if (data.error) throw new Error(data.error.message);
    if (!data.choices?.length) throw new Error("No response from Watsonx");

    return data.choices[0].message.content;
  }

  async generateText(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    return this.callWatsonxAPI(allMessages, options);
  }

  async generateWithTools(
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    tools: SearchToolProvider,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    // Watsonx Granite doesn't natively support tool calling the way
    // AI SDK does. So we pre-run the search tools and inject results
    // into the context as additional information.
    //
    // When AI SDK provider is ready, it will handle tool calling natively
    // via generateWithTools — this is just a compatibility shim.

    // Extract search queries from the user message content
    const userContent = messages.map((m) => m.content).join(" ");
    const queries = this.extractSearchQueries(userContent);

    // Run searches in parallel
    const searchResults = await Promise.all(
      queries.map(async (query) => {
        const [webResults, researchResults] = await Promise.all([
          tools.webSearch(query),
          tools.research(query),
        ]);
        return {
          query,
          webResults,
          researchResults,
        };
      })
    );

    // Format search results as context
    const searchContext = searchResults
      .map((sr) => {
        const webSection = sr.webResults
          .map((r) => `- ${r.title}: ${r.snippet} (${r.url})`)
          .join("\n");
        const researchSection = sr.researchResults
          .map((r) => `- ${r.title}: ${r.snippet} (${r.url})`)
          .join("\n");
        return `Query: "${sr.query}"\nWeb results:\n${webSection}\nResearch results:\n${researchSection}`;
      })
      .join("\n\n");

    // Inject search results into system prompt
    const enhancedPrompt = `${systemPrompt}\n\n# Search results (pre-fetched)\n${searchContext}`;

    return this.callWatsonxAPI(
      [{ role: "system", content: enhancedPrompt }, ...messages],
      options
    );
  }

  /**
   * Extract meaningful search queries from user message.
   * Simple keyword extraction — extracts topic-related terms.
   */
  private extractSearchQueries(content: string): string[] {
    // Extract key terms for search — look for problem/solution statements
    const queries: string[] = [];

    // Look for labeled inputs
    const problemMatch = content.match(/(?:problem|cleanedStatement|problemStatement)[:\s]+(.+?)(?:\n|$)/i);
    if (problemMatch) {
      const topic = problemMatch[1].trim().slice(0, 100);
      queries.push(`${topic} market size 2024`);
      queries.push(`${topic} startup funding`);
      queries.push(`${topic} existing solutions competitors`);
    }

    const solutionMatch = content.match(/(?:solution|direction)[:\s]+(.+?)(?:\n|$)/i);
    if (solutionMatch) {
      const topic = solutionMatch[1].trim().slice(0, 100);
      queries.push(`${topic} existing product startup`);
      queries.push(`${topic} development cost time to build`);
    }

    // Fallback: use first 100 chars as generic query
    if (queries.length === 0) {
      queries.push(content.slice(0, 100).trim());
    }

    return queries.slice(0, 4); // Max 4 queries
  }
}

// Made with Bob
