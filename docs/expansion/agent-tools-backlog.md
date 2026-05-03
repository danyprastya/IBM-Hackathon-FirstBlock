# Agent tools backlog

Ideas for additional tools beyond the three drop-in expansion docs (`tool-reddit-search.md`, `tool-hn-search.md`, `tool-github-search.md`). One-liner per idea — promote any to a full doc when you decide to build it.

- **`producthunt_search`** — direct competitor scan; surfaces recent launches in your space. Requires OAuth (Producthunt API), more friction than the value justifies for hackathon. Best for solutions stage.
- **`arxiv_search`** — research-paper grounding. Only useful for deep-tech problems (AI infra, biotech, novel ML). Public API, no auth.
- **`wikipedia_search`** — general background and entity disambiguation. Already covered by `web_search` (Jina indexes Wikipedia heavily); not worth a dedicated tool unless you want clean structured data.
- **`compute(expression)`** — numerical estimates and Fermi math. Use a JS expression evaluator (`expr-eval` or similar) in a sandbox. Helps the metrics agent and parts of research that estimate TAM.
- **`youtube_search`** — voice-of-customer in video form (founder vlogs, "I tried X for a month" reviews). Needs YouTube Data API key (free tier is generous). Useful for consumer/creator-facing problem spaces.
- **`linkedin_post_search`** — no public API. Skip.
- **`twitter_search`** — paid X API only. Skip.
- **`crunchbase_search`** — funding/competitor data with structure. Paid only. Skip.
- **`stackoverflow_search`** — pain evidence in technical/dev-tool problem spaces. Public Stack Exchange API, no auth needed. Worth promoting to a full doc if your demo problem is dev-tools-shaped.
- **`google_trends`** — search-volume curves. No public API; serpapi.com or unofficial wrappers. Useful market-signal but flaky.

When promoting one to a full doc, follow the structure of `tool-reddit-search.md` exactly: full executor code, registry diff, whitelist diff, prompt update, env vars, smoke test.
