// Trigger.dev task: PhaseAgent — produces ONE phase block.
// Sequential by design: caller fires v1, waits for completion, then fires v2,
// etc. The task reads prior phases from Firestore so the agent has context.

import { logger, task } from "@trigger.dev/sdk/v3";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentExecutor } from "@/lib/agents/executor";
import { AgentRouter } from "@/lib/agents/router";

export type PhasePayload = {
  userId: string;
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
  prdId: string;
  phaseId: string;
  version: string;
};

export const phaseTask = task({
  id: "phase",
  maxDuration: 3600,
  run: async (payload: PhasePayload) => {
    const {
      userId, problemId, researchId,
      solutionCollectionId, solutionId,
      prdId, phaseId, version,
    } = payload;
    const phaseRef = adminDb.doc(
      PATHS.phase(
        userId, problemId, researchId, solutionCollectionId, solutionId, prdId, phaseId
      )
    );

    try {
      logger.log("phase starting", { phaseId, version });

      const [userDoc, prdDoc, scDoc, phasesSnap] = await Promise.all([
        adminDb.doc(PATHS.user(userId)).get(),
        adminDb.doc(
          PATHS.prd(userId, problemId, researchId, solutionCollectionId, solutionId, prdId)
        ).get(),
        adminDb.doc(
          PATHS.solutionCollection(userId, problemId, researchId, solutionCollectionId)
        ).get(),
        adminDb
          .collection(
            PATHS.phases(
              userId, problemId, researchId, solutionCollectionId, solutionId, prdId
            )
          )
          .where("status", "==", "complete")
          .orderBy("order", "asc")
          .get(),
      ]);

      const founderProfile = userDoc.data()?.onboarding ?? null;
      const fullPrd = prdDoc.data()?.fullPrd ?? "";
      const compactedContext = scDoc.data()?.compactedContext ?? "";
      const previousPhases = phasesSnap.docs
        .map((d) => d.data()?.content)
        .filter(Boolean)
        .join("\n\n---\n\n");

      const result = await AgentExecutor.execute(
        AgentRouter.getConfig("Phase"),
        {
          userId,
          stage: "deliver",
          upstreamContext: compactedContext,
          founderProfile,
          specificInputs: { fullPrd, version, previousPhases },
        }
      );

      if (!result.success) {
        logger.error("Phase failed", { error: result.error });
        await phaseRef.update({ status: "failed" });
        throw new Error(result.error ?? "Phase failed");
      }

      await phaseRef.update({ status: "complete", content: result.output });

      logger.log("phase complete", { phaseId, version });
      return { phaseId, version, content: result.output };
    } catch (err) {
      logger.error("phase crashed", { err: String(err) });
      await phaseRef.update({ status: "failed" }).catch(() => {});
      throw err;
    }
  },
});

// Made with Bob
