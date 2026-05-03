// Trigger.dev task: MetricsAgent — produces adoption/value/business metrics.

import { logger, task } from "@trigger.dev/sdk/v3";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentExecutor } from "@/lib/agents/executor";
import { AgentRouter } from "@/lib/agents/router";
import { parseMetrics } from "@/lib/agents/parsers";

export type MetricsPayload = {
  userId: string;
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
  metricsId: string;
};

export const metricsTask = task({
  id: "metrics",
  maxDuration: 3600,
  run: async (payload: MetricsPayload) => {
    const {
      userId, problemId, researchId,
      solutionCollectionId, solutionId, metricsId,
    } = payload;
    const smRef = adminDb.doc(
      PATHS.successMetric(
        userId, problemId, researchId, solutionCollectionId, solutionId, metricsId
      )
    );

    try {
      logger.log("metrics starting", payload);

      const [userDoc, problemDoc, solDoc, scDoc] = await Promise.all([
        adminDb.doc(PATHS.user(userId)).get(),
        adminDb.doc(PATHS.problem(userId, problemId)).get(),
        adminDb.doc(
          PATHS.solution(userId, problemId, researchId, solutionCollectionId, solutionId)
        ).get(),
        adminDb.doc(
          PATHS.solutionCollection(userId, problemId, researchId, solutionCollectionId)
        ).get(),
      ]);

      const founderProfile = userDoc.data()?.onboarding ?? null;
      const chosenProblem = problemDoc.data()?.rawInput ?? "";
      const chosenSolution = solDoc.data()?.direction ?? "";
      const compactedContext = scDoc.data()?.compactedContext ?? "";

      const result = await AgentExecutor.execute(
        AgentRouter.getConfig("Metrics"),
        {
          userId,
          stage: "scope",
          upstreamContext: compactedContext,
          founderProfile,
          specificInputs: { chosenSolution, chosenProblem },
        }
      );

      if (!result.success) {
        logger.error("Metrics failed", { error: result.error });
        await smRef.update({ status: "failed" });
        throw new Error(result.error ?? "Metrics failed");
      }

      const parsed = parseMetrics(result.output);
      await smRef.update({
        status: "complete",
        metrics: {
          adoption: parsed.adoption,
          value: parsed.value,
          business: parsed.business,
        },
      });

      logger.log("metrics complete", { metricsId });
      return { metricsId, ...parsed };
    } catch (err) {
      logger.error("metrics crashed", { err: String(err) });
      await smRef.update({ status: "failed" }).catch(() => {});
      throw err;
    }
  },
});

// Made with Bob
