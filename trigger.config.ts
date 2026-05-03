import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "<set TRIGGER_PROJECT_REF in .env.local>",
  dirs: ["./trigger"],
  runtime: "node",
  logLevel: "log",
  maxDuration: 3600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
});
