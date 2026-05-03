# Expansion — Full branching: lineage view & steer-from-existing

**What:** The MVP supports linear version history per stage (regenerate creates v2 → v3 → …, you can jump back to any). This expansion adds:

1. **Steer-from-existing** — instead of regenerating the *latest* version, branch a new version off any prior version. The new version's `derivedFrom` field tracks the parent.
2. **Lineage view** — a small tree visualization next to the stage section showing how versions branch. Click a node to make it active.
3. **Cross-stage steer** — when steering at stage N, optionally pull the founder's input from stage M (e.g., "use my v2 research's pain-evidence framing in this v3 solutions run").

**Why:** Real founder workflows aren't linear. They explore, back out, try a different angle, merge insights. The MVP fakes this with version history but no real branching.

**Entry points:**
- Schema delta (`02-firestore-schema.md`):
  - Every stage doc gains `derivedFrom?: { entryId: string; entryLabel: string }` (already in the prototype's `lib/types.ts:27-30`).
  - New label scheme: instead of `v1, v2, v3` linear, use `v1`, `v1.a`, `v1.a.i`, etc. — or just keep monotonic labels and rely on `derivedFrom` for the tree shape.
- Mutation: `createXxxFromExisting(parentVersionId, founderInput)` — same as `createXxx` but sets `derivedFrom` on the new doc.
- UI: new component `components/LineageTree.tsx` — renders a tree from `versions[].derivedFrom`. Use `react-arborist` or hand-roll with CSS grid (15–20 nodes max in practice).
- UX: each version row gets a "Branch from this" button (in addition to the existing version picker).

**Non-trivial bits:**
- Determining what's "active" gets ambiguous when there's branching. Convention: `activeXxxId` always points at *the version the user is currently looking at* — could be a leaf or a mid-tree node. Children of inactive nodes are still navigable via the tree.
- Gates (10-pipeline-flow.md) use the *active* version's status; this still works because gating is per-version, not per-tree.

**Estimate:** 1–2 days. Tree UI eats most of the time; data model changes are small.
