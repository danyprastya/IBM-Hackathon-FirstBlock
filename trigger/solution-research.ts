// Trigger.dev task: SolutionResearch (per direction)
// Researches one solution direction with WebSearch + Fetch tools, parses brief.

import { logger, task } from "@trigger.dev/sdk/v3";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { parseSolutionBrief } from "@/lib/agents/parsers";

export type SolutionResearchPayload = {
  userId: string;
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
  direction: string;
};

export const solutionResearchTask = task({
  id: "solution-research",
  maxDuration: 3600,
  run: async (payload: SolutionResearchPayload) => {
    const {
      userId, problemId, researchId,
      solutionCollectionId, solutionId, direction,
    } = payload;
    const solRef = adminDb.doc(
      PATHS.solution(userId, problemId, researchId, solutionCollectionId, solutionId)
    );

    try {
      logger.log("solution-research starting", { solutionId, direction });

      const [userDoc, problemDoc, scDoc] = await Promise.all([
        adminDb.doc(PATHS.user(userId)).get(),
        adminDb.doc(PATHS.problem(userId, problemId)).get(),
        adminDb.doc(
          PATHS.solutionCollection(userId, problemId, researchId, solutionCollectionId)
        ).get(),
      ]);

      const founderProfile = userDoc.data()?.onboarding ?? null;
      const chosenProblem = problemDoc.data()?.rawInput ?? "";
      const compactedContext = scDoc.data()?.compactedContext ?? "";

      const results = await AgentRouter.researchSolutions(
        [{ id: solutionId, direction }],
        chosenProblem,
        compactedContext,
        founderProfile,
        userId
      );
      const result = results[0];

      if (!result.success) {
        logger.error("SolutionResearch failed", { error: result.error });
        await solRef.update({ status: "failed" });
        throw new Error(result.error ?? "SolutionResearch failed");
      }

      const brief = parseSolutionBrief(result.output);
      await solRef.update({ status: "complete", brief });

      logger.log("solution-research complete", { solutionId, verdict: brief.aiVerdict });
      return { solutionId, brief };
    } catch (err) {
      logger.error("solution-research crashed", { err: String(err) });
      await solRef.update({ status: "failed" }).catch(() => {});
      throw err;
    }
  },
});

// Made with Bob
