import { buildNotesArtifact, resolveProjectPath } from "../src/etl/index.js";

// Regenerate the tracked notes artifact from the bundled raw course notes.
const inputPath = resolveProjectPath("data", "raw", "ai-course-notes.md");
const outputPath = resolveProjectPath("data", "notes.json");

await buildNotesArtifact({
  inputPath,
  outputPath,
  documentId: "ai-course-intro",
  documentTitle: "AI Course Intro Notes",
  chunkOptions: {
    maxChars: 220,
    overlap: 1,
  },
});
