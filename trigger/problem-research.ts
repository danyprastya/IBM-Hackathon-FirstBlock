import { logger, task } from "@trigger.dev/sdk/v3";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";
import { parseProblemBrief } from "@/lib/agents/parsers";

export type ProblemResearchPayload = {
  userId: string;
  problemId: string;
  researchId: string;
  problemStatement: string;
};

export const problemResearchTask = task({
  id: "problem-research",
  maxDuration: 3600,
  run: async (payload: ProblemResearchPayload) => {
    const { userId, problemId, researchId, problemStatement } = payload;
    const ref = adminDb.doc(PATHS.research(userId, problemId, researchId));

    try {
      logger.log("problem-research starting", { userId, problemId, researchId });

      const userSnap = await adminDb.doc(PATHS.user(userId)).get();
      const founderProfile = userSnap.data()?.onboarding ?? null;

      const results = await AgentRouter.researchProblems(
        [{ id: problemId, rawInput: problemStatement }],
        founderProfile,
        undefined,
        userId
      );

      const result = results[0];
      if (!result.success) {
        logger.error("ProblemResearch agent failed", { error: result.error });
        await ref.update({ status: "failed" });
        throw new Error(result.error ?? "ProblemResearch agent failed");
      }

      const brief = parseProblemBrief(result.output);
      await ref.update({ status: "complete", brief });

      logger.log("problem-research complete", { researchId, verdict: brief.aiVerdict });
      return { researchId, brief, metadata: result.metadata };
    } catch (err) {
      logger.error("problem-research crashed", { err: String(err) });
      await ref.update({ status: "failed" }).catch(() => {});
      throw err;
    }
  },
});
