import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const deployedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: path.join(configDir, "e2e"),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
      ]
    : "list",
  use: {
    baseURL: deployedBaseUrl || "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: deployedBaseUrl
    ? undefined
    : {
        command: "npm --prefix web run dev -- --webpack --port 3100",
        url: "http://localhost:3100",
        timeout: 120 * 1000,
        reuseExistingServer: false,
        env: {
          ...process.env,
          ANSWER_GENERATION_MODE: "stub",
        },
        stdout: "ignore",
        stderr: "pipe",
      },
});
