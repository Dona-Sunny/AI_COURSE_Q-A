import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.join(configDir, "e2e"),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
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
  webServer: {
    command: "npm --prefix web run dev -- --webpack --port 3100",
    url: "http://localhost:3100",
    timeout: 120 * 1000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});
