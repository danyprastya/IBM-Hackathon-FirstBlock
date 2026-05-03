// Search tool stubs — teammate replaces with real implementations
// Interface contracts stay the same, only internals change

import type { SearchToolProvider, SearchResult } from "./types";

/**
 * Stub search provider — returns empty results.
 * Teammate replaces internals with real web search API.
 *
 * To implement:
 * 1. Replace webSearch() body with actual search API call
 * 2. Replace research() body with deeper research API call
 * 3. Keep the same interface — executor doesn't change
 */
export class StubSearchProvider implements SearchToolProvider {
  async webSearch(query: string): Promise<SearchResult[]> {
    console.log(`[StubSearchProvider] webSearch called: "${query}"`);
    // TODO: teammate implements real web search
    // Example: call Serper API, Google Custom Search, or Tavily
    return [
      {
        title: `[STUB] Search result for: ${query}`,
        url: "https://example.com",
        snippet: "This is a stub result. Replace StubSearchProvider with real implementation.",
      },
    ];
  }

  async research(query: string): Promise<SearchResult[]> {
    console.log(`[StubSearchProvider] research called: "${query}"`);
    // TODO: teammate implements deep research tool
    // Example: call Perplexity API, or multi-step search + synthesis
    return [
      {
        title: `[STUB] Research result for: ${query}`,
        url: "https://example.com",
        snippet: "This is a stub result. Replace StubSearchProvider with real implementation.",
      },
    ];
  }
}

// Made with Bob
