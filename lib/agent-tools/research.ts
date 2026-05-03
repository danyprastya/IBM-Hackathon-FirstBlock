// SERVER ONLY — research tool implementation
// Deeper than webSearch: 10 results, top 2 enriched with full markdown via r.jina.ai.

import type { SearchResult } from "@/lib/agents/types";
import { jinaSearch, jinaRead } from "./jina";

const RICH_SNIPPET_MAX = 800;
const SHORT_SNIPPET_MAX = 300;
const ENRICH_TOP_N = 2;

export async function research(query: string): Promise<SearchResult[]> {
  let raw;
  try {
    raw = await jinaSearch(query, { limit: 10 });
  } catch (err) {
    console.error("[research] search failed:", err instanceof Error ? err.message : err);
    return [];
  }

  const enrichTargets = raw.slice(0, ENRICH_TOP_N);
  const rest = raw.slice(ENRICH_TOP_N);

  const enriched = await Promise.all(
    enrichTargets.map(async (r): Promise<SearchResult> => {
      try {
        const md = await jinaRead(r.url);
        const snippet = md.slice(0, RICH_SNIPPET_MAX).replace(/\s+/g, " ").trim();
        return { title: r.title, url: r.url, snippet };
      } catch {
        return {
          title: r.title,
          url: r.url,
          snippet: (r.description ?? r.content ?? "").slice(0, SHORT_SNIPPET_MAX),
        };
      }
    })
  );

  const tail: SearchResult[] = rest.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: (r.description ?? r.content ?? "").slice(0, SHORT_SNIPPET_MAX),
  }));

  return [...enriched, ...tail];
}

// Made with Bob
