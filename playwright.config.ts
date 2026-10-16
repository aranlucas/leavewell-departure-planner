import process from "node:process";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7000 },
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4310", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 393, height: 852 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "pnpm start",
    url: "http://127.0.0.1:4310/healthz",
    reuseExistingServer: true,
  },
});
