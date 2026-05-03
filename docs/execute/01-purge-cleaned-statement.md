# Execute 01 — Purge `cleanedStatement`

## Goal

The `ProblemDocument` schema has a `cleanedStatement: string` field. **Founder input must never be rewritten by AI** — there is no `clean-problem` agent and there should be no field that implies one. Today the field is set to `""` on creation and never populated by anything; it's dead weight. This brief removes it from the schema and every reference, and confirms downstream agents already consume `rawInput` directly.

After this brief lands, `grep -ri "cleanedStatement" .` returns zero hits across the repo and `docs/`.

## Read first

- [docs/mvp/02-firestore-schema.md](../mvp/02-firestore-schema.md) — the canonical schema, already lists `cleanedStatement` as deprecated.
- [docs/mvp/00-overview.md](../mvp/00-overview.md) § "Founder input is sacred" — the principle this enforces.

## Current state

`lib/firebase/collections.ts` (line ~234):

```ts
export interface ProblemDocument {
  id: string;
  rawInput: string;
  cleanedStatement: string;     // ← REMOVE
  inputType: "text" | "voice";
  createdAt: Date;
}
```

Find every reference:

```bash
grep -rn "cleanedStatement" .
```

Expected hits as of writing:
- `lib/firebase/collections.ts` — the interface field.
- `app/api/agents/problems/route.ts` — sets `cleanedStatement: ""` when creating a problem.
- `app/api/agents/research-problem/route.ts` — passes `cleanedStatement: sanitizedStatement` when calling `AgentRouter.researchProblems`. The route already accepts a `problemStatement` body parameter — the agent never reads from `cleanedStatement` on the doc, only from the body.
- `app/api/agents/generate-solutions/route.ts` — reads `problemDoc.data()?.cleanedStatement` to feed SolutionGenerator. **This is where the rewrite matters most** — switch to reading `rawInput` instead.
- `lib/agents/router.ts` — `researchProblems` accepts `cleanedStatement` in its array shape. Rename to `rawInput`.
- `lib/agents/parsers.ts` — search regex still references the labeled output. Should be safe to leave (the parser strips labels).
- Any docs under `docs/mvp/` and `docs/execute/` (there's an intentional reference in 02-firestore-schema describing the field — remove that mention).

## Files to edit

| Path | Change |
|---|---|
| `lib/firebase/collections.ts` | Delete the `cleanedStatement` field from `ProblemDocument`. |
| `app/api/agents/problems/route.ts` | Remove the `cleanedStatement: ""` from the doc create payload. |
| `app/api/agents/research-problem/route.ts` | Body validator already passes `problemStatement` — no change to the route, just remove any internal use. |
| `app/api/agents/generate-solutions/route.ts` | Replace `problemDoc.data()?.cleanedStatement` with `problemDoc.data()?.rawInput`. |
| `lib/agents/router.ts` | In `researchProblems`, rename the property `cleanedStatement` to `rawInput` in the input array shape and the `specificInputs` map. |
| `docs/mvp/02-firestore-schema.md` | Remove the `cleanedStatement` line + the "DEPRECATED" comment. Remove the verifying step that mentions `cleanedStatement: ""`. |
| `docs/mvp/00-overview.md` | Remove the parenthetical about the field still existing for backwards compatibility. |

## Steps

1. **Edit the schema first.**

   ```ts
   // lib/firebase/collections.ts
   export interface ProblemDocument {
     id: string;
     rawInput: string;
     inputType: "text" | "voice";
     createdAt: Date;
   }
   ```

2. **Run `pnpm tsc --noEmit`.** Every TypeScript error from this point is a real call site — fix each one.

3. **Update `app/api/agents/problems/route.ts`** — when creating the problem doc, drop `cleanedStatement` from the payload:

   ```ts
   await problemRef.set({
     id: problemRef.id,
     rawInput: sanitized,
     inputType,
     createdAt: FieldValue.serverTimestamp(),
   });
   ```

4. **Update `app/api/agents/generate-solutions/route.ts`**:

   ```ts
   const chosenProblem = problemDoc.data()?.rawInput || "";
   ```

   (The variable name `chosenProblem` is what gets passed to `AgentRouter.generateSolutions` — no other rename needed.)

5. **Update `lib/agents/router.ts`** — in `researchProblems`:

   ```ts
   static async researchProblems(
     problems: Array<{ id: string; rawInput: string }>,   // was cleanedStatement
     founderProfile,
     upstreamContext,
     userId,
   ) {
     const configs = problems.map(() => this.getConfig("ProblemResearch"));
     const contexts: AgentExecutionContext[] = problems.map((p) => ({
       userId,
       stage: "define" as const,
       upstreamContext,
       founderProfile,
       specificInputs: {
         problemStatement: p.rawInput,    // key stays "problemStatement" — that's what the executor and prompt template see
         problemId: p.id,
       },
     }));
     return AgentExecutor.executeParallel(configs, contexts);
   }
   ```

   **Important:** the `specificInputs.problemStatement` key is what the agent's user message uses (see `lib/agents/executor.ts.buildMessages`). The prompt template `{{problem.cleanedStatement}}` in `lib/agents/prompts.ts` is the **labeled-section name** in the prompt text — it's not actually substituted; the executor injects `problemStatement: <value>` as a labeled section. Leave the prompt text alone for now (it's labels, not substitutions) — the prompt rewrite happens in `02-watsonx-ai-sdk-migration.md`.

6. **Update the call site in `app/api/agents/research-problem/route.ts`**:

   ```ts
   const results = await AgentRouter.researchProblems(
     [{ id: problemId, rawInput: sanitized }],   // was cleanedStatement
     founderProfile,
     undefined,
     userId
   );
   ```

7. **Update the docs**:

   - In `docs/mvp/02-firestore-schema.md`, edit the `ProblemDocument` interface code block to remove the `cleanedStatement` line and the deprecation comment. Remove step 3 of "Verifying" mention of `cleanedStatement: ""`.
   - In `docs/mvp/00-overview.md`, edit § "Founder input is sacred" to remove the "(The legacy `cleanedStatement` field still exists in `ProblemDocument` for backwards compatibility — see `docs/execute/01-purge-cleaned-statement.md` to remove it.)" parenthetical.

8. **Re-run `pnpm tsc --noEmit`** — should be clean.

## Don't touch

- `lib/agents/prompts.ts` — the prompt text uses `{{problem.cleanedStatement}}` as a labeled section name in the system prompt. It's not a substitution — leave it for the prompt rewrite in brief 02. (If you want to rename the label there too for clarity, it's safe — but it's not required for correctness.)
- `lib/agents/parsers.ts` — extracts fields from agent output, not input. No reference to `cleanedStatement`.
- `app/api/ai/chat/route.ts`, `app/api/onboarding/route.ts`, `app/api/sticky/*` — out of scope.
- `firestore.rules`, `firestore.indexes.json` — schema field rename has no rules impact.

## Verification

```bash
# 1. TypeScript clean
pnpm tsc --noEmit

# 2. No stragglers
grep -ri "cleanedStatement" .   # ZERO hits

# 3. Schema agrees
grep -n "rawInput" lib/firebase/collections.ts
# Shows: rawInput: string;  (and no cleanedStatement)

# 4. End-to-end smoke
pnpm dev
# In a browser tab signed in, fetch:
#   POST /api/agents/problems  body: { "rawInput": "test", "inputType": "text" }
# In Firestore Console, the new doc has rawInput="test", no cleanedStatement field.
```

## Why this is brief 01

Touching the schema breaks every downstream caller — better to land the smallest possible cleanup first than to merge it into the AI SDK migration. Future briefs build on a schema that's already been freed of dead fields.
