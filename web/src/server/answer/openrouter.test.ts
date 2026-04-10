// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  createOpenRouterAnswerGenerator,
  getConfiguredOpenRouterAnswerGenerator,
  getOpenRouterConfig,
} from "./openrouter";
import { AnswerGenerationConfigError } from "./errors";

describe("getOpenRouterConfig", () => {
  it("throws a clear configuration error when OPENROUTER_API_KEY is missing", () => {
    expect(() => getOpenRouterConfig({ OPENROUTER_MODEL: "openrouter/free" })).toThrowError(
      AnswerGenerationConfigError
    );

    expect(() => getOpenRouterConfig({ OPENROUTER_MODEL: "openrouter/free" })).toThrow(
      /OPENROUTER_API_KEY/i
    );
  });

  it("defaults to the free router model when OPENROUTER_MODEL is not set", () => {
    expect(
      getOpenRouterConfig({
        OPENROUTER_API_KEY: "test-key",
      })
    ).toMatchObject({
      apiKey: "test-key",
      model: "openrouter/free",
    });
  });
});

describe("createOpenRouterAnswerGenerator", () => {
  it("uses the OpenAI-compatible OpenRouter chat completions endpoint", async () => {
    const chatCompletionsCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: "  Machine learning learns patterns from data.  ",
          },
        },
      ],
    });
    const createClient = vi.fn().mockReturnValue({
      chat: {
        completions: {
          create: chatCompletionsCreate,
        },
      },
    });

    const generateAnswer = createOpenRouterAnswerGenerator({
      apiKey: "test-key",
      model: "openrouter/free",
      siteUrl: "https://example.com",
      appName: "AI Course Notes Q&A",
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
    ).resolves.toBe("Machine learning learns patterns from data.");

    expect(createClient).toHaveBeenCalledWith({
      apiKey: "test-key",
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://example.com",
        "X-OpenRouter-Title": "AI Course Notes Q&A",
      },
    });
    expect(chatCompletionsCreate).toHaveBeenCalledTimes(1);
    expect(chatCompletionsCreate.mock.calls[0][0]).toMatchObject({
      model: "openrouter/free",
    });
  });
});

describe("getConfiguredOpenRouterAnswerGenerator", () => {
  it("lazily creates the OpenRouter client once and reuses it", async () => {
    const chatCompletionsCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: "A concise answer.",
          },
        },
      ],
    });
    const createClient = vi.fn().mockReturnValue({
      chat: {
        completions: {
          create: chatCompletionsCreate,
        },
      },
    });

    const generateAnswer = getConfiguredOpenRouterAnswerGenerator({
      env: {
        OPENROUTER_API_KEY: "test-key",
      },
      createClient,
    });

    await generateAnswer(["Chunk A"], "Question one?", { supportLevel: "partial" });
    await generateAnswer(["Chunk B"], "Question two?", { supportLevel: "strong" });

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(chatCompletionsCreate).toHaveBeenCalledTimes(2);
  });
});
