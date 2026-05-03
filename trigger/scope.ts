// Trigger.dev task: ScopeAgent — produces MVP scope (in/out lists).

import { logger, task } from "@trigger.dev/sdk/v3";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { AgentExecutor } from "@/lib/agents/executor";
import { AgentRouter } from "@/lib/agents/router";
import { parseScope } from "@/lib/agents/parsers";

export type ScopePayload = {
  userId: string;
  problemId: string;
  researchId: string;
  solutionCollectionId: string;
  solutionId: string;
  mvpId: string;
};

export const scopeTask = task({
  id: "scope",
  maxDuration: 3600,
  run: async (payload: ScopePayload) => {
    const {
      userId, problemId, researchId,
      solutionCollectionId, solutionId, mvpId,
    } = payload;
    const mvpRef = adminDb.doc(
      PATHS.mvp(userId, problemId, researchId, solutionCollectionId, solutionId, mvpId)
    );

    try {
      logger.log("scope starting", payload);

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
        AgentRouter.getConfig("Scope"),
        {
          userId,
          stage: "scope",
          upstreamContext: compactedContext,
          founderProfile,
          specificInputs: { chosenSolution, chosenProblem },
        }
      );

      if (!result.success) {
        logger.error("Scope failed", { error: result.error });
        await mvpRef.update({ status: "failed" });
        throw new Error(result.error ?? "Scope failed");
      }

      const parsed = parseScope(result.output);
      await mvpRef.update({
        status: "complete",
        scopeIn: parsed.scopeIn,
        scopeOut: parsed.scopeOut,
      });

      logger.log("scope complete", { mvpId, inCount: parsed.scopeIn.length });
      return { mvpId, ...parsed };
    } catch (err) {
      logger.error("scope crashed", { err: String(err) });
      await mvpRef.update({ status: "failed" }).catch(() => {});
      throw err;
    }
  },
});

// Made with Bob
