import { writeFile } from "node:fs/promises";

import {
  buildNotesArtifact,
  resolveProjectPath,
  serializeNotesArtifact,
} from "../src/etl/index.js";

// Regenerate the tracked notes artifact from the bundled raw course notes.
const inputPath = resolveProjectPath("data", "raw", "ai-course-notes.md");
const rootOutputPath = resolveProjectPath("data", "notes.json");
const webOutputPath = resolveProjectPath("web", "data", "notes.json");

const records = await buildNotesArtifact({
  inputPath,
  outputPath: rootOutputPath,
  documentId: "ai-course-intro",
  documentTitle: "AI Course Intro Notes",
  chunkOptions: {
    maxChars: 220,
    overlap: 1,
  },
});

await writeFile(webOutputPath, serializeNotesArtifact(records), "utf8");
