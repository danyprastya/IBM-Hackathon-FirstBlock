// Trigger.dev task: PRDWriter — produces full PRD markdown from upstream docs.
// Requires founderConfirmed on both MVP and SuccessMetrics; the start route
// guards this before triggering.

import { logger, task } from "@trigger.dev/sdk/v3";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentRouter } from "@/lib/agents/router";

export type PrdWriterPayload = {
  userId: string;
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
  mvpId: string;
  metricsId: string;
  prdId: string;
};

export const prdWriterTask = task({
  id: "prd-writer",
  maxDuration: 3600,
  run: async (payload: PrdWriterPayload) => {
    const {
      userId, problemId, researchId,
      solutionCollectionId, solutionId,
      mvpId, metricsId, prdId,
    } = payload;
    const prdRef = adminDb.doc(
      PATHS.prd(userId, problemId, researchId, solutionCollectionId, solutionId, prdId)
    );

    try {
      logger.log("prd-writer starting", payload);

      const [
        problemDoc, researchDoc, solDoc, mvpDoc, smDoc, scDoc,
      ] = await Promise.all([
        adminDb.doc(PATHS.problem(userId, problemId)).get(),
        adminDb.doc(PATHS.research(userId, problemId, researchId)).get(),
        adminDb.doc(
          PATHS.solution(userId, problemId, researchId, solutionCollectionId, solutionId)
        ).get(),
        adminDb.doc(
          PATHS.mvp(userId, problemId, researchId, solutionCollectionId, solutionId, mvpId)
        ).get(),
        adminDb.doc(
          PATHS.successMetric(
            userId, problemId, researchId, solutionCollectionId, solutionId, metricsId
          )
        ).get(),
        adminDb.doc(
          PATHS.solutionCollection(userId, problemId, researchId, solutionCollectionId)
        ).get(),
      ]);

      const researchData = researchDoc.data();
      const solData = solDoc.data();
      const mvpData = mvpDoc.data();
      const smData = smDoc.data();
      const compactedContext = scDoc.data()?.compactedContext ?? "";

      const problemBrief = researchData?.brief
        ? `Problem: ${problemDoc.data()?.rawInput}\nMarket signal: ${researchData.brief.marketSignal}\nPain evidence: ${researchData.brief.painEvidence}\nCompetition: ${researchData.brief.competition} — ${researchData.brief.competitionNote}\nVerdict: ${researchData.brief.aiVerdict}\nReason: ${researchData.brief.aiReason}`
        : "";

      const solutionBrief = solData?.brief
        ? `Solution: ${solData.direction}\nFeasibility: ${solData.brief.feasibility}\nDifferentiation: ${solData.brief.differentiation}\nFounder edge: ${solData.brief.founderEdge}\nVerdict: ${solData.brief.aiVerdict}\nReason: ${solData.brief.aiReason}`
        : "";

      const result = await AgentRouter.writePRD(
        problemBrief,
        solutionBrief,
        mvpData?.scopeIn ?? [],
        mvpData?.scopeOut ?? [],
        smData?.metrics ?? { adoption: "", value: "", business: "" },
        compactedContext,
        {
          mvp: mvpData?.founderEdits ?? undefined,
          metrics: smData?.founderEdits ?? undefined,
        },
        userId
      );

      if (!result.success) {
        logger.error("PRDWriter failed", { error: result.error });
        await prdRef.update({ status: "failed" });
        throw new Error(result.error ?? "PRDWriter failed");
      }

      await prdRef.update({ status: "complete", fullPrd: result.output });

      logger.log("prd-writer complete", { prdId });
      return { prdId, fullPrd: result.output };
    } catch (err) {
      logger.error("prd-writer crashed", { err: String(err) });
      await prdRef.update({ status: "failed" }).catch(() => {});
      throw err;
    }
  },
});

// Made with Bob
