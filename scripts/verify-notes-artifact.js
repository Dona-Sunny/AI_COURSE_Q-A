import { resolveProjectPath, verifyNotesArtifact } from "../src/etl/index.js";

const result = await verifyNotesArtifact({
  inputPath: resolveProjectPath("data", "raw", "ai-course-notes.md"),
  outputPath: resolveProjectPath("data", "notes.json"),
  documentId: "ai-course-intro",
  documentTitle: "AI Course Intro Notes",
  chunkOptions: {
    maxChars: 220,
    overlap: 1
  }
});

if (!result.ok) {
  console.error(result.message);
  process.exitCode = 1;
} else {
  console.log("Processed notes artifact is in sync.");
}
