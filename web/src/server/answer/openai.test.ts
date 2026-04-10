// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  AnswerGenerationConfigError,
  getConfiguredAnswerGenerator,
  getOpenAIConfig,
} from "./openai";

describe("getOpenAIConfig", () => {
  it("throws a clear configuration error when OPENAI_API_KEY is missing", () => {
    expect(() => getOpenAIConfig({ OPENAI_MODEL: "gpt-4o-mini" })).toThrowError(
      AnswerGenerationConfigError
    );

    expect(() => getOpenAIConfig({ OPENAI_MODEL: "gpt-4o-mini" })).toThrow(
      /OPENAI_API_KEY/i
    );
  });

  it("throws a clear configuration error when OPENAI_MODEL is missing", () => {
    expect(() => getOpenAIConfig({ OPENAI_API_KEY: "test-key" })).toThrowError(
      AnswerGenerationConfigError
    );

    expect(() => getOpenAIConfig({ OPENAI_API_KEY: "test-key" })).toThrow(
      /OPENAI_MODEL/i
    );
  });
});

describe("getConfiguredAnswerGenerator", () => {
  it("uses the OpenAI Responses API and returns trimmed output text", async () => {
    const responsesCreate = vi.fn().mockResolvedValue({
      output_text: "  Machine learning finds patterns from data.  ",
    });
    const createClient = vi.fn().mockReturnValue({
      responses: {
        create: responsesCreate,
      },
    });

    const generateAnswer = getConfiguredAnswerGenerator({
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "gpt-4o-mini",
      },
      createClient,
    });

    await expect(
      generateAnswer(
        [
          "Machine learning is a subset of artificial intelligence.",
          "Supervised learning uses labeled examples.",
        ],
        "What is machine learning?",
        { supportLevel: "strong" }
      )
    ).resolves.toBe("Machine learning finds patterns from data.");

    expect(createClient).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(responsesCreate).toHaveBeenCalledTimes(1);
    expect(responsesCreate.mock.calls[0][0]).toMatchObject({
      model: "gpt-4o-mini",
    });
    expect(responsesCreate.mock.calls[0][0].input).toContain(
      "What is machine learning?"
    );
  });
});
