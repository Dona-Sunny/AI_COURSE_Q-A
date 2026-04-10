import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { buildNotesArtifact, verifyNotesArtifact } from "../src/etl/index.js";

test("verifyNotesArtifact reports success when the tracked artifact matches regenerated notes", async () => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "ai-course-q-a-verify-"));
  const inputPath = path.join(sandbox, "raw-notes.md");
  const outputPath = path.join(sandbox, "notes.json");

  await writeFile(
    inputPath,
    [
      "Artificial intelligence studies intelligent systems.",
      "Machine learning learns patterns from data.",
      "Neural networks are layered models."
    ].join("\n\n"),
    "utf8"
  );

  await buildNotesArtifact({
    inputPath,
    outputPath,
    documentId: "doc-1",
    documentTitle: "Sample Notes",
    chunkOptions: { maxChars: 90, overlap: 1 }
  });

  const result = await verifyNotesArtifact({
    inputPath,
    outputPath,
    documentId: "doc-1",
    documentTitle: "Sample Notes",
    chunkOptions: { maxChars: 90, overlap: 1 }
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, "in-sync");
});

test("verifyNotesArtifact reports drift when the tracked artifact is out of date", async () => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "ai-course-q-a-verify-"));
  const inputPath = path.join(sandbox, "raw-notes.md");
  const outputPath = path.join(sandbox, "notes.json");

  await writeFile(
    inputPath,
    [
      "Artificial intelligence studies intelligent systems.",
      "Machine learning learns patterns from data."
    ].join("\n\n"),
    "utf8"
  );
  await writeFile(outputPath, JSON.stringify([{ stale: true }], null, 2), "utf8");

  const result = await verifyNotesArtifact({
    inputPath,
    outputPath,
    documentId: "doc-1",
    documentTitle: "Sample Notes",
    chunkOptions: { maxChars: 90, overlap: 1 }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "out-of-sync");
  assert.match(result.message, /run npm run etl:build/i);
});
