# Expansion — Exports (PRD → Markdown / Notion / PDF)

**What:** A "Download" / "Export" button on the final PRD that ships the full document (PRD body + phases + scope + metrics) to an external destination.

**Why:** The PRD's value is in being shared with co-founders, investors, advisors. Right now it lives in Firestore — useless for sharing.

**Entry points:**
- `components/sections/PrdSection.tsx` — add an Export menu next to the existing UI.
- `lib/exports/`:
  - `markdown.ts` — assembles a single `.md` blob from `prd.fullPrd` + a rendered scope/metrics block + phases. Pure string concatenation; download via `Blob` + anchor.
  - `notion.ts` — Notion API integration. Requires user OAuth. Parse markdown to Notion blocks (use `martian` or write a minimal converter).
  - `pdf.ts` — server-side route `POST /api/export/pdf` that takes the markdown, runs it through `puppeteer-core` + `@sparticuz/chromium` (Vercel-compatible) → returns a PDF buffer. Or skip server: render with `react-pdf` client-side.
- For Notion: requires a separate auth flow and a "connected accounts" UI. Big enough to warrant its own sub-doc when you build it.

**Estimate:**
- Markdown: 30 min.
- PDF: 2–3 hours (Chromium binary in Vercel function is fiddly).
- Notion: half a day (OAuth + block conversion).
