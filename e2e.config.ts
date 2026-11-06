import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";

export default {
  tests: "test/journeys/**/*.e2e.ts",
  targets: [
    {
      name: "chromium",
      engine: web(),
      app: {
        url: "http://127.0.0.1:4310",
        command: { executable: "node", args: ["server.mjs"] },
      },
    },
  ],
  workers: 1,
  retries: 0,
  trace: "retain-on-failure",
  reporters: ["list", "junit"],
} satisfies E2EConfig;
