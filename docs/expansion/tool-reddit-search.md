# Expansion — `reddit_search` tool

Drop-in. Adds a dedicated Reddit search tool to the research agent. Surfaces founder/user pain in their own words far better than `site:reddit.com` filters in `web_search`.

## Files to add

### `lib/agent-tools/reddit-search.ts`

```ts
import { tool } from "ai";
import { z } from "zod";

const params = z.object({
  query: z.string().min(1).max(200),
  subreddit: z.string().regex(/^[a-zA-Z0-9_]{1,21}$/).optional(),
  sort: z.enum(["relevance", "hot", "top", "new"]).optional(),
  time: z.enum(["hour", "day", "week", "month", "year", "all"]).optional(),
  limit: z.number().int().min(1).max(25).optional(),
});

interface RedditChild {
  data: {
    title: string;
    subreddit: string;
    score: number;
    num_comments: number;
    permalink: string;
    selftext?: string;
    created_utc: number;
    author: string;
    url: string;
  };
}

const UA = process.env.REDDIT_USER_AGENT
  ?? "firstblock-research/1.0 (anonymous; contact: ops@firstblock.app)";

export const redditSearch = tool({
  description:
    "Search Reddit for community discussions: pain-point threads, founder complaints, real " +
    "user vocabulary, sentiment. Use heavily for problem-validation and pain-evidence. " +
    "You can scope to a subreddit (e.g., 'startups', 'Entrepreneur', 'SaaS', 'indiehackers', " +
    "'sysadmin', or any domain-specific community) for higher signal, or omit subreddit to " +
    "search all of Reddit. Sort by relevance for topical hits, by 'top' with time='year' for " +
    "the highest-engagement threads in a window. Returns thread title, subreddit, score, " +
    "comment count, permalink, and a selftext snippet.",
  inputSchema: params,
  execute: async ({ query, subreddit, sort = "relevance", time = "year", limit = 10 }) => {
    const path = subreddit ? `r/${subreddit}/search.json` : `search.json`;
    const url = new URL(`https://www.reddit.com/${path}`);
    url.searchParams.set("q", query);
    if (subreddit) url.searchParams.set("restrict_sr", "1");
    url.searchParams.set("sort", sort);
    url.searchParams.set("t", time);
    url.searchParams.set("limit", String(limit));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: ctrl.signal,
      });
      if (!res.ok) return { ok: false, error: `reddit_${res.status}` };

      const json = (await res.json()) as { data?: { children?: RedditChild[] } };
      const results = (json.data?.children ?? []).map((c) => ({
        title: c.data.title,
        subreddit: c.data.subreddit,
        score: c.data.score,
        num_comments: c.data.num_comments,
        author: c.data.author,
        permalink: `https://www.reddit.com${c.data.permalink}`,
        url: c.data.url,
        selftext: (c.data.selftext ?? "").slice(0, 500),
        created_utc: c.data.created_utc,
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

### 1. Register the tool

`lib/agent-tools/index.ts` — add one line:
```ts
import { redditSearch } from "./reddit-search";

export const tools = {
  web_search: webSearch,
  fetch_url: fetchUrl,
  reddit_search: redditSearch,  // NEW
} as const;
```

### 2. Whitelist on research agent

`lib/agents/research.ts` — pass it in:
```ts
tools: {
  web_search: tools.web_search,
  fetch_url: tools.fetch_url,
  reddit_search: tools.reddit_search,  // NEW
},
```

### 3. Update research prompt

In `08-agent-prompts.md`'s research system prompt, replace the pain-evidence bullet:
> Replace: `"site:reddit.com/r/startups <topic>", "site:reddit.com/r/Entrepreneur <topic>"...`
> With: `"Use reddit_search for pain evidence — start with subreddit='startups', then 'Entrepreneur', 'indiehackers', and any domain-specific subreddit you can name. Sort by 'top' with time='year' for highest-engagement threads."`

## Env vars

Add to `.env.local` and Vercel:
```bash
REDDIT_USER_AGENT=firstblock-research/1.0 (by /u/<your_username>)  # OPTIONAL but recommended
```

Reddit aggressively rate-limits anonymous defaults. Setting a real UA with your username avoids most issues. Future expansion: OAuth (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`) for 60 req/min stable rate.

## Smoke test

```bash
curl -A "firstblock-research/1.0 (test)" \
  "https://www.reddit.com/r/startups/search.json?q=PRD&restrict_sr=1&sort=top&t=year&limit=3" \
  | jq '.data.children[0].data | {title, score, num_comments}'
```

Then exercise via the agent:
```ts
const { response, toolCalls } = await generateText({
  model, tools, maxSteps: 4,
  prompt: "Search r/startups for threads about writing PRDs. Use reddit_search.",
});
console.log(toolCalls.map((c) => c.toolName)); // expect: ["reddit_search"]
```

## Why this beats `site:reddit.com`

- Direct access to score and comment count → the model can reason about engagement.
- No reliance on Jina indexing freshness.
- Subreddit scoping is precise; site-search picks up wrong subreddits.
- Selftext snippets give richer context than search result snippets.
