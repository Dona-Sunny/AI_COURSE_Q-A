import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { retrieveRelevantChunks } from "../src/retrieval/index.js";
import { routeQuestion } from "../src/ask/index.js";

async function loadNotes() {
  const content = await readFile(path.resolve("data", "notes.json"), "utf8");
  return JSON.parse(content);
}

test("routeQuestion bypasses answer generation and returns refusal for none support", async () => {
  const notes = await loadNotes();
  const retrievalResult = retrieveRelevantChunks(
    notes,
    "Explain bayesian theorem and posterior probability"
  );

  let called = false;

  const response = await routeQuestion({
    retrievalResult,
    generateAnswer: async () => {
      called = true;
      return "This should never be returned.";
    }
  });

  assert.equal(called, false);
  assert.equal(response.supportLevel, "none");
  assert.match(response.answer, /could not find enough relevant information/i);
});

test("routeQuestion calls answer generation and appends limitation note for partial support", async () => {
  const notes = await loadNotes();
  const retrievalResult = retrieveRelevantChunks(notes, "Explain hidden complex patterns");

  let received;

  const response = await routeQuestion({
    retrievalResult,
    generateAnswer: async (context, question, meta) => {
      received = { context, question, meta };
      return "Hidden layers help deep learning models capture complex patterns.";
    }
  });

  assert.equal(response.supportLevel, "partial");
  assert.equal(received.question, "Explain hidden complex patterns");
  assert.equal(received.meta.supportLevel, "partial");
  assert.ok(received.context.length >= 1);
  assert.match(response.answer, /may be incomplete/i);
});

test("routeQuestion calls answer generation without limitation note for strong support", async () => {
  const notes = await loadNotes();
  const retrievalResult = retrieveRelevantChunks(
    notes,
    "What is machine learning in artificial intelligence?"
  );

  let calls = 0;

  const response = await routeQuestion({
    retrievalResult,
    generateAnswer: async () => {
      calls += 1;
      return "Machine learning is a subset of artificial intelligence that learns patterns from data.";
    }
  });

  assert.equal(calls, 1);
  assert.equal(response.supportLevel, "strong");
  assert.doesNotMatch(response.answer, /may be incomplete/i);
  assert.ok(response.sources.length > 0);
});
