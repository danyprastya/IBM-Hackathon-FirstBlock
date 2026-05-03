// Trigger.dev task: SolutionGenerator
// Decides N (2-4) + emits direction strings, then writes one solution doc
// per direction (status: "pending") under the parent solutionCollection.

import { logger, task } from "@trigger.dev/sdk/v3";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { parseSolutionDirections } from "@/lib/agents/parsers";
import { FieldValue } from "firebase-admin/firestore";

export type SolutionGenerationPayload = {
  userId: string;
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
};

export const solutionGenerationTask = task({
  id: "solution-generation",
  maxDuration: 3600,
  run: async (payload: SolutionGenerationPayload) => {
    const { userId, problemId, researchId, solutionCollectionId } = payload;
    const scRef = adminDb.doc(
      PATHS.solutionCollection(userId, problemId, researchId, solutionCollectionId)
    );

    try {
      logger.log("solution-generation starting", payload);

      const [userDoc, problemDoc, researchDoc] = await Promise.all([
        adminDb.doc(PATHS.user(userId)).get(),
        adminDb.doc(PATHS.problem(userId, problemId)).get(),
        adminDb.doc(PATHS.research(userId, problemId, researchId)).get(),
      ]);

      const founderProfile = userDoc.data()?.onboarding ?? null;
      const chosenProblem = problemDoc.data()?.rawInput ?? "";
      const compactedContext = researchDoc.data()?.compactedContext ?? "";

      const result = await AgentRouter.generateSolutions(
        chosenProblem,
        compactedContext,
        founderProfile,
        userId
      );

      if (!result.success) {
        logger.error("SolutionGenerator failed", { error: result.error });
        await scRef.update({ status: "failed" });
        throw new Error(result.error ?? "SolutionGenerator failed");
      }

      const parsed = parseSolutionDirections(result.output);

      // Write one solution doc per direction.
      const created = await Promise.all(
        parsed.directions.map(async (direction) => {
          const solRef = adminDb
            .collection(
              PATHS.solutions(userId, problemId, researchId, solutionCollectionId)
            )
            .doc();
          await solRef.set({
            id: solRef.id,
            direction,
            createdAt: FieldValue.serverTimestamp(),
            status: "pending",
            brief: {
              feasibility: "",
              differentiation: "",
              founderEdge: "",
              aiVerdict: "watch",
              aiReason: "",
            },
            founderDecision: null,
          });
          return { id: solRef.id, direction };
        })
      );

      await scRef.update({
        status: "complete",
        solutionCount: parsed.count,
      });

      logger.log("solution-generation complete", {
        solutionCollectionId,
        count: parsed.count,
      });
      return { solutionCollectionId, count: parsed.count, solutions: created };
    } catch (err) {
      logger.error("solution-generation crashed", { err: String(err) });
      await scRef.update({ status: "failed" }).catch(() => {});
      throw err;
    }
  },
});

// Made with Bob
