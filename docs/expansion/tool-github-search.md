# Expansion — `github_search` tool

Drop-in. Adds GitHub repo and issue search via the public REST API. Optional `GITHUB_TOKEN` raises rate limit from 60 to 5000 requests/hour. Most useful on the Solutions agent.

## Files to add

### `lib/agent-tools/github-search.ts`

```ts
import { tool } from "ai";
import { z } from "zod";

const params = z.object({
  query: z.string().min(1).max(256),
  kind: z.enum(["repositories", "issues"]).optional(),
  sort: z.enum(["stars", "updated", "created", "best-match"]).optional(),
  per_page: z.number().int().min(1).max(30).optional(),
});

interface RepoItem {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  topics?: string[];
}
interface IssueItem {
  title: string;
  html_url: string;
  state: string;
  comments: number;
  created_at: string;
  body: string | null;
}

export const githubSearch = tool({
  description:
    "Search GitHub repositories and issues. Use for: existing OSS solutions in your space " +
    "(kind='repositories', sort='stars' surfaces well-known libraries), technical " +
    "competitors with their own implementations, popular libraries you could build on, and " +
    "feature-request issues showing real user pain (kind='issues'). For Solutions agent, " +
    "this surfaces 'is someone already solving this in OSS?' evidence to anchor differentiation.",
  inputSchema: params,
  execute: async ({ query, kind = "repositories", sort = "stars", per_page = 10 }) => {
    const url = new URL(`https://api.github.com/search/${kind}`);
    url.searchParams.set("q", query);
    if (sort !== "best-match") url.searchParams.set("sort", sort);
    url.searchParams.set("per_page", String(per_page));

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const res = await fetch(url, { headers, signal: ctrl.signal });
      if (!res.ok) {
        if (res.status === 403) return { ok: false, error: "rate_limited_set_GITHUB_TOKEN" };
        return { ok: false, error: `github_${res.status}` };
      }
      const json = (await res.json()) as { items?: (RepoItem | IssueItem)[] };
      const items = json.items ?? [];

      if (kind === "repositories") {
        return {
          ok: true,
          results: (items as RepoItem[]).map((r) => ({
            full_name: r.full_name,
            description: r.description ?? "",
            html_url: r.html_url,
            stars: r.stargazers_count,
            language: r.language ?? "unknown",
            updated_at: r.updated_at,
            topics: r.topics ?? [],
          })),
        };
      }
      return {
        ok: true,
        results: (items as IssueItem[]).map((i) => ({
          title: i.title,
          html_url: i.html_url,
          state: i.state,
          comments: i.comments,
          created_at: i.created_at,
          body: (i.body ?? "").slice(0, 400),
        })),
      };
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
import { githubSearch } from "./github-search";

export const tools = {
  web_search: webSearch,
  fetch_url: fetchUrl,
  github_search: githubSearch,  // NEW
} as const;
```

### 2. Whitelist on solutions agent

`lib/agents/solutions.ts`:
```ts
tools: {
  web_search: tools.web_search,
  fetch_url: tools.fetch_url,
  github_search: tools.github_search,  // NEW
}
```

(Optional: also add to research if your problem space is technical-tool-heavy. Skip otherwise — research already has plenty of breadth.)

### 3. Prompt update for solutions

In `08-agent-prompts.md`'s solutions system prompt, replace:
> `"Use web_search for OSS analogues: 'site:github.com <topic>', 'open source X'."`

with:
> `"Use github_search with kind='repositories' and sort='stars' to find OSS analogues. The top 5 by stars are usually 'who's already in this space.' Reference 1–2 of them by full_name in your differentiation field. If you find a popular OSS project that solves the same problem, that's a signal toward 'crowded' or 'differentiate strongly'."`

## Env vars

```bash
GITHUB_TOKEN=ghp_...   # OPTIONAL — bumps rate from 60/hr (anon) to 5000/hr (PAT)
```

To create one: GitHub → Settings → Developer settings → Personal access tokens (classic) → Generate. **No scopes needed** — public search works with no permissions selected.

For Vercel: paste it into Project → Settings → Environment Variables.

## Smoke test

```bash
curl -H "Accept: application/vnd.github+json" \
  "https://api.github.com/search/repositories?q=PRD+template&sort=stars&per_page=3" \
  | jq '.items[] | {full_name, description, stars: .stargazers_count}'
```

Via agent:
```ts
const { toolCalls } = await generateText({
  model, tools, maxSteps: 4,
  prompt: "Find OSS PRD-writing tools on GitHub. Use github_search.",
});
console.log(toolCalls);
```

## Why on Solutions and not Research

Research is about validating the problem (do users have this pain?). GitHub doesn't tell you that — it tells you who's already trying to solve it. That's a Solutions-stage question. Putting `github_search` on Research would just slow it down with low-signal results.
