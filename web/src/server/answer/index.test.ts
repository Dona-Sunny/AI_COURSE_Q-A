// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { getAnswerGenerator } from "./index";

describe("getAnswerGenerator", () => {
  it("returns a deterministic stub generator when ANSWER_GENERATION_MODE=stub", async () => {
    const createClient = vi.fn();

    const generateAnswer = getAnswerGenerator({
      env: {
        ANSWER_GENERATION_MODE: "stub",
      },
      createClient,
    });

    await expect(
      generateAnswer(["Context chunk"], "What is machine learning?", {
        supportLevel: "strong",
      })
    ).resolves.toContain('Stub answer for "What is machine learning?"');

    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns the OpenRouter-backed generator when ANSWER_GENERATION_MODE=openrouter", async () => {
    const chatCompletionsCreate = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: "OpenRouter answered from the notes.",
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

    const generateAnswer = getAnswerGenerator({
      env: {
        ANSWER_GENERATION_MODE: "openrouter",
        OPENROUTER_API_KEY: "test-key",
      },
      createClient,
    });

    await expect(
      generateAnswer(["Context chunk"], "Explain neural networks.", {
        supportLevel: "partial",
      })
    ).resolves.toBe("OpenRouter answered from the notes.");

    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
