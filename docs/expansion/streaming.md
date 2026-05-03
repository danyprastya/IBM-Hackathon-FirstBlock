# Expansion — Streaming agent output

**What:** Replace one-shot agent calls with token-by-token UI rendering. The user sees the brief / solutions / PRD assemble live instead of staring at a spinner.

**Why:** Big perceived-latency win for the demo. A 90s research run feels okay if you can read the output as it builds.

**Entry points:**
- The patched provider (`lib/watsonx/provider.ts` → `06-watsonx-integration.md`) already implements `doStream` for text-only output. Streaming with tool calls is harder — Watsonx returns tool_calls non-incrementally, so the natural unit is "stream the final structured output after all tool calls complete."
- API routes need to switch from `Response` to a streaming response. Use Next.js's built-in streaming via the `ai` SDK's `toDataStreamResponse()`.
- UI changes: each section component subscribes to the streamed response and progressively renders. For JSON outputs (research brief, solutions), use the `ai` SDK's `useObject` hook on the client.
- Firestore writes happen at stream end (still one final `update`), but the client doesn't wait — it's already consuming the stream.

**Non-trivial bits:**
- Reconciling the Firestore-listener-driven UX with stream-driven UX: pick one source of truth per stage during streaming, then re-sync from Firestore once the stream closes.
- For tool-using agents, the user sees the tool calls happen — opportunity to render a "Searching Reddit for X…" indicator. Hook into `onStepFinish` and emit progress events on a side channel.

Estimate: 1 day after MVP is up.
