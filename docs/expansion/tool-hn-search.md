# Expansion — `hn_search` tool

Drop-in. Adds Hacker News search via the public Algolia API. No auth required. Adds to research and solutions agents.

## Files to add

### `lib/agent-tools/hn-search.ts`

```ts
import { tool } from "ai";
import { z } from "zod";

const params = z.object({
  query: z.string().min(1).max(200),
  tags: z.enum(["story", "comment", "show_hn", "ask_hn", "front_page"]).optional(),
  sort: z.enum(["relevance", "recent"]).optional(),
  hits: z.number().int().min(1).max(50).optional(),
});

interface HnHit {
  objectID: string;
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  author: string;
  points?: number;
  num_comments?: number;
  created_at: string;
  comment_text?: string;
}

export const hnSearch = tool({
  description:
    "Search Hacker News stories and comments via Algolia. Use for technical/founder " +
    "discussion in your problem space, Show HN posts (existing products in your space), " +
    "Ask HN pain-point threads, and recent funding/news with technical context. " +
    "tags='show_hn' surfaces product launches; tags='ask_hn' surfaces pain threads; " +
    "tags='story' (default) is general front-page-eligible content. " +
    "sort='recent' returns chronological; default is relevance-sorted.",
  inputSchema: params,
  execute: async ({ query, tags = "story", sort = "relevance", hits = 15 }) => {
    const endpoint = sort === "recent" ? "search_by_date" : "search";
    const url = new URL(`https://hn.algolia.com/api/v1/${endpoint}`);
    url.searchParams.set("query", query);
    url.searchParams.set("tags", tags);
    url.searchParams.set("hitsPerPage", String(hits));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return { ok: false, error: `hn_${res.status}` };

      const json = (await res.json()) as { hits?: HnHit[] };
      const results = (json.hits ?? []).map((h) => ({
        title: h.title ?? h.story_title ?? "(no title)",
        url: h.url ?? h.story_url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        story_url: `https://news.ycombinator.com/item?id=${h.objectID}`,
        author: h.author,
        points: h.points ?? 0,
        num_comments: h.num_comments ?? 0,
        created_at: h.created_at,
        comment_snippet: (h.comment_text ?? "").slice(0, 400),
      }));
      return { ok: true, results };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg.includes("aborted") ? "timeout" : msg };
    } finally {
      clearTimeout(timer);
    }
  },
});
```

## Wiring

### 1. Register

`lib/agent-tools/index.ts`:
```ts
import { hnSearch } from "./hn-search";

export const tools = {
  web_search: webSearch,
  fetch_url: fetchUrl,
  hn_search: hnSearch,  // NEW
} as const;
```

### 2. Whitelist

Research:
```ts
tools: {
  web_search: tools.web_search,
  fetch_url: tools.fetch_url,
  hn_search: tools.hn_search,
}
```

Solutions:
```ts
tools: {
  web_search: tools.web_search,
  fetch_url: tools.fetch_url,
  hn_search: tools.hn_search,
}
```

### 3. Prompt updates

**Research** (`08-agent-prompts.md`):
- Replace `"site:news.ycombinator.com <topic>"` strategy bullet with: `"Use hn_search with tags='ask_hn' for pain-point threads and tags='show_hn' to find existing competing launches in the space."`

**Solutions** (`08-agent-prompts.md`):
- Add to strategy: `"Use hn_search with tags='show_hn' to find recent product launches addressing this problem — these are direct competitors and inspiration for differentiation."`

## Env vars

None required. The Algolia public API is unauthenticated.

## Smoke test

```bash
curl "https://hn.algolia.com/api/v1/search?query=founder+PRD&tags=ask_hn&hitsPerPage=3" \
  | jq '.hits[] | {title: (.title // .story_title), points, num_comments, url: .story_url}'
```

Via agent:
```ts
const { toolCalls } = await generateText({
  model, tools, maxSteps: 4,
  prompt: "Find Show HN posts about PRD tools. Use hn_search.",
});
console.log(toolCalls); // expect at least one hn_search with tags="show_hn"
```

## Why this is high-value

- Show HN posts = "someone shipped this exact thing" — gold for differentiation analysis.
- Ask HN pain threads tend to have detailed discussion in comments (set tags='comment' to search within comments).
- HN voters self-select for technical depth; signal/noise is higher than general web.
