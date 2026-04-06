import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { retrieveRelevantChunks } from "../src/retrieval/index.js";

async function loadNotes() {
  const content = await readFile(path.resolve("data", "notes.json"), "utf8");
  return JSON.parse(content);
}

test("retrieveRelevantChunks returns the top ranked chunks for a supported question", async () => {
  const notes = await loadNotes();

  const result = retrieveRelevantChunks(notes, "What is machine learning in artificial intelligence?");

  assert.equal(result.supportLevel, "strong");
  assert.ok(result.results.length > 0);
  assert.ok(result.results.length <= 3);
  assert.equal(result.results[0].chunkId, "ai-course-intro-chunk-2");
  assert.deepEqual(result.results[0].matchedTerms.sort(), [
    "artificial",
    "intelligence",
    "learning",
    "machine"
  ]);
});

test("retrieveRelevantChunks returns none when no meaningful overlap exists", async () => {
  const notes = await loadNotes();

  const result = retrieveRelevantChunks(notes, "Explain bayesian theorem and posterior probability");

  assert.equal(result.supportLevel, "none");
  assert.deepEqual(result.results, []);
});

test("retrieveRelevantChunks returns partial when support is concentrated in one chunk", async () => {
  const notes = await loadNotes();

  const result = retrieveRelevantChunks(notes, "Explain hidden complex patterns");

  assert.equal(result.supportLevel, "partial");
  assert.ok(result.results.length >= 1);
  assert.equal(result.results[0].chunkId, "ai-course-intro-chunk-5");
  assert.equal(result.results[0].score, 3);
});

test("retrieveRelevantChunks returns strong when matched terms are supported across multiple chunks", async () => {
  const notes = await loadNotes();

  const result = retrieveRelevantChunks(notes, "How do machine learning models use data?");

  assert.equal(result.supportLevel, "strong");
  assert.equal(result.results.length, 3);
  assert.ok(result.results.every((chunk) => chunk.score > 0));
});
