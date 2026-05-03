// SERVER ONLY — TitleAgent
// Generates a short display title from raw founder input. Runs once on
// problem creation and never again — founder can rename via the PATCH
// route. Does NOT rewrite the founder's text; rawInput stays verbatim.

import { WatsonxProvider } from "./providers/watsonx";

const SYSTEM = `You write short titles for startup ideas.

Given a founder's raw idea dump, output a 4-8 word title that captures the essence. Plain noun phrase. No punctuation. No marketing language ("revolutionary", "innovative", "next-generation", "AI-powered" unless literally about AI). No quotes. No introduction or explanation.

Output only the title — nothing else.`;

const MAX_TITLE_CHARS = 60;

const provider = new WatsonxProvider();

/** Strip surrounding quotes/whitespace/trailing punctuation; cap length. */
function sanitize(raw: string): string {
  return raw
    .replace(/^["'\s]+|["'\s.!?,;:]+$/g, "")
    .split("\n")[0]
    .trim()
    .slice(0, MAX_TITLE_CHARS);
}

/** Returns "" on failure — caller falls back to truncated rawInput. */
export async function runTitleAgent(rawInput: string): Promise<string> {
  if (!rawInput.trim()) return "";

  try {
    const raw = await provider.generateText(
      SYSTEM,
      [{ role: "user", content: rawInput }],
      { maxTokens: 30, temperature: 0.4 }
    );
    return sanitize(raw);
  } catch (err) {
    console.error("[TitleAgent] failed:", err instanceof Error ? err.message : err);
    return "";
  }
}

// Made with Bob
