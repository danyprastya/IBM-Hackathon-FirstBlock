// SERVER ONLY — Jina API helpers
// s.jina.ai for search, r.jina.ai for URL → markdown
// Keyless works (low rate limits); set JINA_API_KEY for production.

interface JinaSearchResult {
  title: string;
  url: string;
  description?: string;
  content?: string;
}

const SEARCH_TIMEOUT_MS = 30_000;
const READ_TIMEOUT_MS = 60_000;
const READ_MAX_CHARS = 8_000;

function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return true;
  if (host.endsWith(".local")) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

function jinaHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers = { ...extra };
  if (process.env.JINA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
  }
  return headers;
}

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Search the open web via Jina s.jina.ai. Returns up to `limit` raw results. */
export async function jinaSearch(
  query: string,
  opts: { limit?: number } = {}
): Promise<JinaSearchResult[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 5, 10));
  const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
  const headers = jinaHeaders({ Accept: "application/json" });

  return withTimeout(async (signal) => {
    const res = await fetch(url, { headers, signal });
    if (!res.ok) {
      throw new Error(`jina_search_${res.status}`);
    }
    const data = (await res.json()) as { data?: JinaSearchResult[] };
    return (data.data ?? []).slice(0, limit);
  }, SEARCH_TIMEOUT_MS);
}

/** Fetch one URL and return clean readable markdown via Jina r.jina.ai. */
export async function jinaRead(rawUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("invalid_url");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("non_http_scheme");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error("private_host_blocked");
  }

  const target = `https://r.jina.ai/${parsed.toString()}`;
  const headers = jinaHeaders({ Accept: "text/markdown" });

  return withTimeout(async (signal) => {
    const res = await fetch(target, { headers, signal });
    if (!res.ok) {
      throw new Error(`jina_reader_${res.status}`);
    }
    const text = await res.text();
    return text.slice(0, READ_MAX_CHARS);
  }, READ_TIMEOUT_MS);
}

// Made with Bob
