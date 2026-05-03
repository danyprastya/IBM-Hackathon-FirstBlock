// SERVER ONLY — WebSearch tool definition
// Registered with the Watsonx tool loop. Returns up to 5 search results.

import type { ToolDefinition } from "@/lib/agents/types";
import { jinaSearch } from "./jina";

const SNIPPET_MAX = 300;
const RESULT_LIMIT = 5;

export const WebSearch: ToolDefinition = {
  name: "WebSearch",
  description:
    "Search the open public web. Returns up to 5 results with title, URL, " +
    "and a short snippet. Use multiple targeted queries with different angles — " +
    "broad coverage beats one perfect query. Best for news, market data, " +
    "funding announcements, competitor names, and user complaint threads on " +
    "Reddit/HN. Site-scoped queries work: site:reddit.com, site:news.ycombinator.com.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query — keywords, can include site: operators.",
      },
    },
    required: ["query"],
  },
  async execute(args) {
    const query = String(args.query ?? "").trim();
    if (!query) return JSON.stringify({ error: "empty_query" });

    try {
      const raw = await jinaSearch(query, { limit: RESULT_LIMIT });
      const results = raw.map((r) => ({
        title: r.title,
        url: r.url,
        snippet: (r.description ?? r.content ?? "").slice(0, SNIPPET_MAX),
      }));
      return JSON.stringify({ ok: true, query, results });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[WebSearch] failed:", message);
      return JSON.stringify({ ok: false, error: message });
    }
  },
};

// Made with Bob
