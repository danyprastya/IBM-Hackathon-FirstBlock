// SERVER ONLY — Fetch tool definition
// Pulls one URL and returns clean readable markdown via r.jina.ai.
// SSRF blocklist enforced inside jinaRead.

import type { ToolDefinition } from "@/lib/agents/types";
import { jinaRead } from "./jina";

export const Fetch: ToolDefinition = {
  name: "Fetch",
  description:
    "Fetch one URL from a WebSearch result and return its content as readable " +
    "markdown. Use this to read the full content of a promising result — a " +
    "Reddit thread, an HN discussion, a competitor's homepage, an article. " +
    "Be selective: limit to 2-3 fetches per run. Do not Fetch URLs you " +
    "haven't seen in WebSearch results.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Full http(s) URL to fetch. Must come from a prior WebSearch result.",
      },
    },
    required: ["url"],
  },
  async execute(args) {
    const url = String(args.url ?? "").trim();
    if (!url) return JSON.stringify({ error: "empty_url" });

    try {
      const markdown = await jinaRead(url);
      return JSON.stringify({ ok: true, url, markdown });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Fetch] failed:", message);
      return JSON.stringify({ ok: false, url, error: message });
    }
  },
};

// Made with Bob
