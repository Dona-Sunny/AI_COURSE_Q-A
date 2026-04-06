import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildChunkRecords,
  buildNotesArtifact,
  normalizeText,
  splitIntoParagraphs,
  tokenize
} from "../src/etl/index.js";

test("normalizeText lowercases, removes punctuation, and collapses whitespace", () => {
  assert.equal(
    normalizeText("  Neural Networks, ARE   powerful! "),
    "neural networks are powerful"
  );
});

test("tokenize removes stopwords while preserving meaningful terms", () => {
  assert.deepEqual(tokenize("Machine learning is a subset of AI"), [
    "machine",
    "learning",
    "subset",
    "ai"
  ]);
});

test("splitIntoParagraphs keeps semantic paragraph boundaries", () => {
  const paragraphs = splitIntoParagraphs("First paragraph.\n\nSecond paragraph.\nStill second.");

  assert.deepEqual(paragraphs, [
    "First paragraph.",
    "Second paragraph. Still second."
  ]);
});

test("splitIntoParagraphs keeps markdown headings attached to the following paragraph", () => {
  const paragraphs = splitIntoParagraphs("# Title\n\nDefinition paragraph.");

  assert.deepEqual(paragraphs, ["# Title Definition paragraph."]);
});

test("buildChunkRecords produces deterministic chunk records with metadata and helper fields", () => {
  const records = buildChunkRecords(
    "doc-1",
    "Sample Notes",
    [
      "Artificial intelligence studies intelligent systems.",
      "Machine learning learns patterns from data.",
      "Neural networks are layered models."
    ].join("\n\n"),
    { maxChars: 90, overlap: 1 }
  );

  assert.equal(records.length, 3);
  assert.deepEqual(records[0], {
    documentId: "doc-1",
    documentTitle: "Sample Notes",
    chunkId: "doc-1-chunk-1",
    text: "Artificial intelligence studies intelligent systems.",
    normalizedText: "artificial intelligence studies intelligent systems",
    tokens: ["artificial", "intelligence", "studies", "intelligent", "systems"]
  });
  assert.equal(records[1].documentId, "doc-1");
  assert.match(records[1].chunkId, /^doc-1-chunk-\d+$/);
  assert.ok(records[1].tokens.length > 0);
});

test("buildNotesArtifact writes a reproducible JSON artifact", async () => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "ai-course-q-a-"));
  const outputPath = path.join(sandbox, "notes.json");
  const inputPath = path.resolve("data", "raw", "ai-course-notes.md");

  const records = await buildNotesArtifact({
    inputPath,
    outputPath,
    documentId: "ai-course-intro",
    documentTitle: "AI Course Intro Notes",
    chunkOptions: { maxChars: 220, overlap: 1 }
  });

  const written = await readFile(outputPath, "utf8");
  const parsed = JSON.parse(written);

  assert.deepEqual(parsed, records);
  assert.ok(parsed.length >= 3);
  assert.equal(parsed[0].documentId, "ai-course-intro");
  assert.equal(parsed[0].documentTitle, "AI Course Intro Notes");
});
