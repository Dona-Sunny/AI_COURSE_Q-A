// @vitest-environment node

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { AnswerGenerationConfigError } from "../answer/openai";
import { handleAskRequest } from "./ask";

async function writeNotesFixture() {
  const sandbox = await mkdtemp(path.join(tmpdir(), "ai-course-q-a-web-"));
  const notesPath = path.join(sandbox, "notes.json");

  await writeFile(
    notesPath,
    JSON.stringify(
      [
        {
          documentId: "doc-1",
          documentTitle: "AI Course Intro Notes",
          chunkId: "doc-1-chunk-1",
          text: "Machine learning learns patterns from data.",
          normalizedText: "machine learning learns patterns from data",
          tokens: ["machine", "learning", "learns", "patterns", "data"],
        },
      ],
      null,
      2
    ),
    "utf8"
  );

  return notesPath;
}

describe("handleAskRequest", () => {
  it("returns a clear configuration error when answer generation is required but not configured", async () => {
    const notesPath = await writeNotesFixture();

    const result = await handleAskRequest({
      body: { question: "What is machine learning?" },
      notesPath,
      generateAnswer: vi.fn().mockRejectedValue(
        new AnswerGenerationConfigError(
          "Missing OPENAI_API_KEY. Set OPENAI_API_KEY to enable grounded answers."
        )
      ),
    });

    expect(result.status).toBe(500);
    expect(result.json).toEqual({
      error:
        "Answer generation is not configured. Set OPENAI_API_KEY and OPENAI_MODEL for supported answers.",
    });
  });

  it("returns a clear quota message when the OpenAI provider reports insufficient quota", async () => {
    const notesPath = await writeNotesFixture();

    const result = await handleAskRequest({
      body: { question: "What is machine learning?" },
      notesPath,
      generateAnswer: vi.fn().mockRejectedValue({
        status: 429,
        code: "insufficient_quota",
        type: "insufficient_quota",
      }),
    });

    expect(result.status).toBe(503);
    expect(result.json).toEqual({
      error:
        "Answer generation is temporarily unavailable because the OpenAI quota is exhausted. Please try again later.",
    });
  });

  it("still returns a deterministic refusal for unsupported questions even when answer generation is misconfigured", async () => {
    const notesPath = await writeNotesFixture();
    const generateAnswer = vi.fn().mockRejectedValue(
      new AnswerGenerationConfigError(
        "Missing OPENAI_API_KEY. Set OPENAI_API_KEY to enable grounded answers."
      )
    );

    const result = await handleAskRequest({
      body: { question: "What is blockchain consensus?" },
      notesPath,
      generateAnswer,
    });

    expect(result.status).toBe(200);
    expect(result.json.supportLevel).toBe("none");
    expect(result.json.answer).toMatch(/could not find enough relevant information/i);
    expect(generateAnswer).not.toHaveBeenCalled();
  });
});
