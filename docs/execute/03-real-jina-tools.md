# Execute 03 — Real Jina tools

## Goal

`lib/agents/tools.ts` ships `StubSearchProvider` returning one fake result per call. After brief 02 (Watsonx → AI SDK), the placeholder `lib/agent-tools/index.ts` exports `tools = {} as const`. ProblemResearch and SolutionResearch run but cite no real evidence.

This brief replaces both with real Jina-backed tools — `web_search` (via `s.jina.ai`) and `fetch_url` (via `r.jina.ai`) — wired into the AI SDK's `tools` parameter so the agent can call them through real `tool_calls` round-trips.

After this brief: ProblemResearch produces briefs with real URLs and numbers from r/startups, HN, Google results, etc.

## Read first

- [docs/mvp/07-agent-tools.md](../mvp/07-agent-tools.md) — full spec for the two tools, including SSRF blocklist and 8 KB truncation. **Copy the tool implementations from §"Tool 1 — `web_search`" and §"Tool 2 — `fetch_url`" verbatim.**
- [docs/mvp/08-agent-prompts.md](../mvp/08-agent-prompts.md) — ProblemResearch and SolutionResearch prompts already instruct the agent to call `webSearch` / `research` (the prompt template names — see Step 3 for naming).
- Current code:
  - `lib/agents/tools.ts` — `StubSearchProvider` (delete).
  - `lib/agent-tools/index.ts` — placeholder created in brief 02 (replace).
  - The new `lib/agents/agents/problem-research.ts`, `solution-generator.ts`, `solution-research.ts` from brief 02 — they import `tools` from `@/lib/agent-tools`.

## Files to add

| Path | Purpose |
|---|---|
| `lib/agent-tools/web-search.ts` | Jina `s.jina.ai` tool, registered as `web_search`. |
| `lib/agent-tools/fetch-url.ts` | Jina `r.jina.ai` tool with SSRF blocklist, registered as `fetch_url`. |

## Files to edit

| Path | Change |
|---|---|
| `lib/agent-tools/index.ts` | Export `{ web_search: webSearch, fetch_url: fetchUrl }` instead of empty object. |
| `lib/agents/prompts.ts` | The prompt currently mentions tool names `webSearch` and `research`. Update to `web_search` and `fetch_url` so the agent's tool calls match the registered names. **This is a focused string replacement, not a rewrite.** |
| `.env.local` (and prod secrets) | `JINA_API_KEY=<optional>` — keyless works at lower rate limits. |

## Files to delete

| Path | Why |
|---|---|
| `lib/agents/tools.ts` | Stub search provider, no longer referenced. |

## Steps

### Step 1 — write `lib/agent-tools/web-search.ts`

Copy from `docs/mvp/07-agent-tools.md` §"Tool 1 — `web_search`" verbatim:

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

// Made with Bob
```

### Step 2 — write `lib/agent-tools/fetch-url.ts`

Copy from `docs/mvp/07-agent-tools.md` §"Tool 2 — `fetch_url`" verbatim:

```ts
import { tool } from "ai";
import { z } from "zod";

const params = z.object({ url: z.string().url() });

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

// Made with Bob
```

### Step 3 — wire the registry

Replace `lib/agent-tools/index.ts`:

```ts
import { webSearch } from "./web-search";
import { fetchUrl } from "./fetch-url";

export const tools = {
  web_search: webSearch,
  fetch_url: fetchUrl,
} as const;

export type ToolName = keyof typeof tools;

// Made with Bob
```

The agent files from brief 02 (`problem-research.ts`, `solution-generator.ts`, `solution-research.ts`) already import `tools` from `@/lib/agent-tools` — no change needed there.

### Step 4 — align prompt tool names

The prompts in `lib/agents/prompts.ts` reference the tools by the names `webSearch` and `research`. The new tools are registered as `web_search` and `fetch_url`. The model's tool calls must match the registered names exactly, or the AI SDK will reject them.

Find every reference in `lib/agents/prompts.ts`:

```bash
grep -n "webSearch\|^research " lib/agents/prompts.ts
```

Update each prompt's tool-availability section:

- `webSearch` → `web_search`
- `research` (the standalone tool name, not the noun) → `fetch_url`

For example, in `PROBLEM_RESEARCH`:

```
# Available tools
You have access to two tools. Use both actively throughout your research process.

web_search — Use this to run targeted keyword queries against the live web. Best for finding
recent news, market data, funding announcements, competitor names, and user complaint threads.
Call this tool multiple times with different query angles to get broad coverage. Do not rely
on a single search.

fetch_url — Use this to read a specific webpage in full. Best for pulling the body of a top
search result — a Reddit thread, an HN discussion, a competitor's homepage, an article. Be
selective; limit yourself to the 2–3 highest-signal URLs per agent run.

You are expected to call these tools actively — not once, but as many times as needed to fill
all four research areas below with real, grounded data. Do not proceed to writing the brief
until you have called at least one tool per research area.
```

Apply the same rename in `SOLUTION_GENERATOR` and `SOLUTION_RESEARCH`.

### Step 5 — delete the stub

```bash
rm lib/agents/tools.ts
```

### Step 6 — update tests for SSRF

Add a quick regression test (or document the manual test):

```ts
import { fetchUrl } from "@/lib/agent-tools/fetch-url";

// Should return private_host_blocked for each
await fetchUrl.execute({ url: "http://localhost:8080/admin" });
await fetchUrl.execute({ url: "http://127.0.0.1/" });
await fetchUrl.execute({ url: "http://10.0.0.1/" });
await fetchUrl.execute({ url: "http://192.168.1.1/" });
await fetchUrl.execute({ url: "http://172.20.0.1/" });
```

## Don't touch

- `lib/watsonx/provider.ts`, `lib/watsonx/model.ts` — established in brief 02. Tool wiring goes through the AI SDK; provider already maps tool params correctly.
- `lib/agents/agents/scope.ts`, `metrics.ts`, `prd-writer.ts`, `phase.ts`, `context-compactor.ts` — these don't use tools.
- `app/api/ai/chat/route.ts` — the chat assistant uses `callWatsonx` directly, no tools, out of scope.

## Verification

```bash
# 1. Files exist, stub gone
ls lib/agent-tools/web-search.ts lib/agent-tools/fetch-url.ts
test ! -f lib/agents/tools.ts

# 2. Registry exports both
node -e "console.log(Object.keys(require('./lib/agent-tools').tools))"
# → [ 'web_search', 'fetch_url' ]

# 3. TS clean
pnpm tsc --noEmit

# 4. SSRF blocked
# (run the inline test from Step 6)

# 5. End-to-end
pnpm dev
# Sign in. Submit a problem with a researchable topic, e.g.
#   "Solo founders struggle to keep their AI coding tools' contexts in sync across machines"
# Run research. After 30-120s, the brief should contain real URLs (search results)
# and at least one numeric or proper-noun reference. The previous stub-text marker
# "[STUB]" should NOT appear.

# 6. Optional: real-world rate limits
# Without JINA_API_KEY, you'll hit Jina's keyless rate limit after ~10-20 searches.
# Set JINA_API_KEY in .env.local for higher limits.
```

## Why this is brief 03

Real tools were impossible until the AI SDK migration (brief 02) gave us a real `tool_calls` round-trip. Watchdog (brief 04) is meaningless without real tool calls to watch. The UI (brief 05) wants real evidence to render in briefs.
