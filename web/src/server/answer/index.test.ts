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
});
