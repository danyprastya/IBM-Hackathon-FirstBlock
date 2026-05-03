// Trigger.dev task: generate a short title for a freshly-created problem.
// Fires from POST /api/agents/problems and updates the problem doc when done.

import { logger, task } from "@trigger.dev/sdk/v3";
import { adminDb } from "@/lib/firebase/admin";
import { PATHS } from "@/lib/firebase/collections";
import { runTitleAgent } from "@/lib/agents/title";

export type TitleGenerationPayload = {
  userId: string;
  problemId: string;
  rawInput: string;
};

export const titleGenerationTask = task({
  id: "title-generation",
  maxDuration: 60,
  run: async (payload: TitleGenerationPayload) => {
    const { userId, problemId, rawInput } = payload;
    const ref = adminDb.doc(PATHS.problem(userId, problemId));

    const title = await runTitleAgent(rawInput);

    if (!title) {
      logger.warn("title-generation produced empty title", { problemId });
      return { problemId, title: null };
    }

    await ref.update({ title }).catch((err) => {
      logger.error("title-generation: firestore update failed", { err: String(err) });
    });

    logger.log("title-generation complete", { problemId, title });
    return { problemId, title };
  },
});

// Made with Bob
