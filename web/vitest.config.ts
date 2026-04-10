import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      // Mirror the app's import alias so component and server tests exercise the
      // same module paths used in the Next.js project.
      "@": path.join(configDir, "src"),
    },
    preserveSymlinks: true,
  },
});
