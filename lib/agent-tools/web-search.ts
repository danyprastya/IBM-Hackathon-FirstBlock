// SERVER ONLY — webSearch tool implementation
// Fast, targeted Jina search. 5 results, short snippets.

import type { SearchResult } from "@/lib/agents/types";
import { jinaSearch } from "./jina";

const SNIPPET_MAX = 300;

export async function webSearch(query: string): Promise<SearchResult[]> {
  try {
    const results = await jinaSearch(query, { limit: 5 });
    return results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: (r.description ?? r.content ?? "").slice(0, SNIPPET_MAX),
    }));
  } catch (err) {
    console.error("[webSearch] failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

// Made with Bob
