import { readFile } from "node:fs/promises";

import { resolveProjectPath, verifyNotesArtifact } from "../src/etl/index.js";

// Fail CI when the committed notes artifact drifts from regenerated ETL output.
const rootOutputPath = resolveProjectPath("data", "notes.json");
const webOutputPath = resolveProjectPath("web", "data", "notes.json");

const result = await verifyNotesArtifact({
  inputPath: resolveProjectPath("data", "raw", "ai-course-notes.md"),
  outputPath: rootOutputPath,
  documentId: "ai-course-intro",
  documentTitle: "AI Course Intro Notes",
  chunkOptions: {
    maxChars: 220,
    overlap: 1,
  },
});

if (!result.ok) {
  console.error(result.message);
  process.exitCode = 1;
} else {
  const [rootArtifact, webArtifact] = await Promise.all([
    readFile(rootOutputPath, "utf8"),
    readFile(webOutputPath, "utf8"),
  ]);

  if (rootArtifact !== webArtifact) {
    console.error("web/data/notes.json is out of sync. Run npm run etl:build.");
    process.exitCode = 1;
  } else {
    console.log("Processed notes artifact is in sync.");
  }
}
