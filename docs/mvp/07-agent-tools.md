# 07 — Agent Tools

> **Status note:** The actual code in `lib/agents/tools.ts` ships a `StubSearchProvider` that returns one fake result per call. ProblemResearch and SolutionResearch run, but their briefs cite no real evidence. Replacing the stub with the Jina-backed `web_search` and `fetch_url` defined below is `docs/execute/03-real-jina-tools.md` — and is the highest-ROI code change in the closing-the-gap plan. This doc is the target spec for that change.

Two tools, both via Jina AI. They cover web search and URL reading. Site-scoped queries (`site:reddit.com`, `site:news.ycombinator.com`, `site:github.com`) replace dedicated social/code tools in the MVP — those exist as drop-in expansion docs (`docs/expansion/tool-*.md`) when you're ready to add them.

## Tool registry

`lib/agent-tools/index.ts` — single export object, fed straight into `generateText({tools})`:

```ts
import { webSearch } from "./web-search";
import { fetchUrl } from "./fetch-url";

export const tools = {
  web_search: webSearch,
  fetch_url: fetchUrl,
} as const;

export type ToolName = keyof typeof tools;
```

Adding a tool = adding one line here + one new file. Removing one = the inverse.

## Tool 1 — `web_search`

`lib/agent-tools/web-search.ts`:

```ts
import { tool } from "ai";
import { z } from "zod";

const params = z.object({
  query: z.string().min(1).max(200),
  max_results: z.number().int().min(1).max(10).optional(),
});

interface JinaResult {
  title: string;
  url: string;
  description?: string;
  content?: string;
}

export const webSearch = tool({
  description:
    "Search the open public web (Google-like). Returns up to 10 results with title, URL, " +
    "and a short snippet. Use for market signals, funding news, competitor discovery, " +
    "pain-point threads on Reddit/HN/forums (search results will include those domains), " +
    "and general background. Use multiple targeted queries rather than one broad query — " +
    "different queries surface different angles.",
  inputSchema: params,
  execute: async ({ query, max_results = 5 }) => {
    const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (process.env.JINA_API_KEY) {
      headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const res = await fetch(url, { headers, signal: ctrl.signal });
      if (!res.ok) {
        return { ok: false, error: `jina_search_${res.status}` };
      }
      const data = (await res.json()) as { data?: JinaResult[] };
      const results = (data.data ?? []).slice(0, max_results).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: (r.description ?? r.content ?? "").slice(0, 300),
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

## Tool 2 — `fetch_url`

`lib/agent-tools/fetch-url.ts`:

```ts
import { tool } from "ai";
import { z } from "zod";

const params = z.object({
  url: z.string().url(),
});

const isPrivateHost = (host: string): boolean => {
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return true;
  if (host.endsWith(".local")) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
};

export const fetchUrl = tool({
  description:
    "Fetch one URL and return clean readable markdown. Use to read the most promising " +
    "result from web_search — e.g. a top Reddit thread, an HN discussion, a competitor's " +
    "homepage, an article. Be selective: this is expensive. Limit yourself to the 2–3 " +
    "highest-signal URLs per agent run.",
  inputSchema: params,
  execute: async ({ url }) => {
    let parsed: URL;
    try { parsed = new URL(url); } catch { return { ok: false, error: "invalid_url" }; }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "non_http_scheme" };
    }
    if (isPrivateHost(parsed.hostname)) {
      return { ok: false, error: "private_host_blocked" };
    }

    const target = `https://r.jina.ai/${parsed.toString()}`;
    const headers: Record<string, string> = { Accept: "text/markdown" };
    if (process.env.JINA_API_KEY) {
      headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    try {
      const res = await fetch(target, { headers, signal: ctrl.signal });
      if (!res.ok) {
        return { ok: false, error: `jina_reader_${res.status}` };
      }
      const text = await res.text();
      const truncated = text.length > 8000;
      return {
        ok: true,
        url: parsed.toString(),
        markdown: text.slice(0, 8000),
        truncated,
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

## Whitelist per stage

Different agents pass different `tools` subsets to `generateText`:

```ts
// research agent
import { tools } from "@/lib/agent-tools";
const researchTools = { web_search: tools.web_search, fetch_url: tools.fetch_url };

// solutions agent
const solutionsTools = { web_search: tools.web_search, fetch_url: tools.fetch_url };

// other agents: no tools — use generateObject (Pattern A in 06)
```

Per-stage whitelist:

| Stage | Tools |
|---|---|
| clean-problem | none |
| research | `web_search`, `fetch_url` |
| solutions | `web_search`, `fetch_url` |
| scope, metrics, prd, phases | none |

## Loop bounds (deep-research without footguns)

No fixed step cap — the agent runs until satisfied OR hits one of these:

1. **Wallclock budget** — each tool-using route declares `export const maxDuration = 300` (or your plan's max). Pass `abortSignal: AbortSignal.timeout(maxDurationMs - 20_000)` to `generateText` so the loop aborts before Vercel kills the request.
2. **Per-tool timeout** — 30s for `web_search`, 60s for `fetch_url` (already enforced inside executors above). Timeouts return `{ok: false, error: "timeout"}` so the agent keeps going with whatever it has.
3. **Result truncation** — `fetch_url` slices at 8000 chars; `web_search` returns at most 10 results, snippets ≤300 chars. Bounds context growth.
4. **Repeat-call watchdog** — `lib/agents/watchdog.ts` (see `06-watsonx-integration.md`) terminates the loop if the same `(toolName, args)` repeats 3× consecutively.
5. **Soft cap via prompt** — system prompt tells the model "5–15 well-chosen calls is normal" and includes `{{remainingSeconds}}` so it can pace.
6. **Hard ceiling** — `maxSteps: process.env.AGENT_MAX_STEPS ?? 50`. Prevents runaway token burn even if all the above fail.

## Smoke test

Run this from a one-off Node script (or temp API route) after the patched provider is in place:

```ts
import { generateText } from "ai";
import { model } from "@/lib/watsonx/model";
import { tools } from "@/lib/agent-tools";

const { response, toolCalls } = await generateText({
  model,
  tools,
  maxSteps: 4,
  system: "You are a research assistant. Use tools to find concrete numbers, then answer.",
  prompt: "How many startups currently use Vercel as their hosting? Use web_search.",
});
console.log("steps:", response.messages.length);
console.log("tool calls:", toolCalls.map((c) => `${c.toolName}(${JSON.stringify(c.input)})`));
console.log("final:", response.messages.at(-1));
```

Expected: at least one `web_search` tool call, then a final assistant message citing a number with a source. If you see the model "describe" a tool call instead of emitting one, the provider's tool wiring is wrong (re-check `06-watsonx-integration.md`) or the chosen Granite model doesn't support function calling.

## Expansion path

Three drop-in tool docs deepen research without changing anything in this file:

- `docs/expansion/tool-reddit-search.md` — direct Reddit `.json` search, scoped subreddits, optional OAuth.
- `docs/expansion/tool-hn-search.md` — HN Algolia API, no auth, tags (story/comment/show_hn/ask_hn).
- `docs/expansion/tool-github-search.md` — repos and issues, optional `GITHUB_TOKEN`.

Each tells you: which `lib/agent-tools/<file>.ts` to add, which line of the registry to extend, which whitelist to update, and which prompt section in `08-agent-prompts.md` to revise. Pick the one whose signal type your demo most needs.
