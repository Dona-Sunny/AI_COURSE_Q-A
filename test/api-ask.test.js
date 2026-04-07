import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { handleAskRequest } from "../src/api/ask.js";
import { resetNotesCache } from "../src/notes/index.js";

test.beforeEach(() => {
  resetNotesCache();
});

test("handleAskRequest returns 400 when question is missing", async () => {
  const response = await handleAskRequest({
    body: {},
    generateAnswer: async () => "unused"
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.json, {
    error: "A question is required."
  });
});

test("handleAskRequest returns deterministic refusal for none support", async () => {
  let called = false;

  const response = await handleAskRequest({
    body: { question: "Explain bayesian theorem and posterior probability" },
    generateAnswer: async () => {
      called = true;
      return "unused";
    }
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.supportLevel, "none");
  assert.equal(called, false);
  assert.match(response.json.answer, /could not find enough relevant information/i);
});

test("handleAskRequest returns limited answer for partial support", async () => {
  const response = await handleAskRequest({
    body: { question: "Explain hidden complex patterns" },
    generateAnswer: async () =>
      "Hidden layers help deep learning models capture complex patterns."
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.supportLevel, "partial");
  assert.match(response.json.answer, /may be incomplete/i);
  assert.ok(response.json.sources.length >= 1);
});

test("handleAskRequest returns grounded answer for strong support", async () => {
  const response = await handleAskRequest({
    body: { question: "What is machine learning in artificial intelligence?" },
    generateAnswer: async () =>
      "Machine learning is a subset of artificial intelligence that learns patterns from data."
  });

  assert.equal(response.status, 200);
  assert.equal(response.json.supportLevel, "strong");
  assert.doesNotMatch(response.json.answer, /may be incomplete/i);
  assert.ok(response.json.sources.length > 0);
  assert.equal(response.json.question, "What is machine learning in artificial intelligence?");
});

test("handleAskRequest returns 500 when notes are unavailable", async () => {
  const missingPath = path.join(tmpdir(), "missing-notes.json");

  const response = await handleAskRequest({
    body: { question: "What is AI?" },
    generateAnswer: async () => "unused",
    notesPath: missingPath
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.json, {
    error: "Course notes are currently unavailable."
  });
});

test("handleAskRequest returns 500 when notes are malformed", async () => {
  const sandbox = await mkdtemp(path.join(tmpdir(), "ai-course-q-a-notes-"));
  const malformedPath = path.join(sandbox, "notes.json");

  await writeFile(malformedPath, "{\"bad\":true}\n", "utf8");

  const response = await handleAskRequest({
    body: { question: "What is AI?" },
    generateAnswer: async () => "unused",
    notesPath: malformedPath
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.json, {
    error: "Course notes are currently unavailable."
  });
});
