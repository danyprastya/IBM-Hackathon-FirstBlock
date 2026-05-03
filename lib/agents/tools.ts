// SERVER ONLY — search tool providers used by research agents.
// JinaSearchProvider hits real Jina endpoints; StubSearchProvider returns
// canned data for local dev without a JINA_API_KEY.

import type { SearchToolProvider, SearchResult } from "./types";
import { webSearch } from "@/lib/agent-tools/web-search";
import { research } from "@/lib/agent-tools/research";

/** Jina-backed search. Default in production. */
export class JinaSearchProvider implements SearchToolProvider {
  webSearch(query: string): Promise<SearchResult[]> {
    return webSearch(query);
  }
  research(query: string): Promise<SearchResult[]> {
    return research(query);
  }
}

/**
 * Stub provider — returns canned results.
 * Useful for local dev without network or for unit-testing the agent loop.
 * Wire it in via setSearchProvider() in executor.ts.
 */
export class StubSearchProvider implements SearchToolProvider {
  async webSearch(query: string): Promise<SearchResult[]> {
    console.log(`[StubSearchProvider] webSearch: "${query}"`);
    return [
      {
        title: `[STUB] Search result for: ${query}`,
        url: "https://example.com",
        snippet: "Stub result. Set JINA_API_KEY and use JinaSearchProvider for real data.",
      },
    ];
  }

  async research(query: string): Promise<SearchResult[]> {
    console.log(`[StubSearchProvider] research: "${query}"`);
    return [
      {
        title: `[STUB] Research result for: ${query}`,
        url: "https://example.com",
        snippet: "Stub result. Set JINA_API_KEY and use JinaSearchProvider for real data.",
      },
    ];
  }
}

// Made with Bob
