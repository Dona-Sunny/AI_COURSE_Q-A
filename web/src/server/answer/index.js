import { getConfiguredAnswerGenerator } from "./openai.js";
import { getConfiguredOpenRouterAnswerGenerator } from "./openrouter.js";

function createStubAnswerGenerator() {
  return async function generateAnswer(_context, question, meta) {
    return `Stub answer for "${question}" with support level "${meta.supportLevel}".`;
  };
}

export function getAnswerGenerationMode(env = process.env) {
  return env.ANSWER_GENERATION_MODE?.trim().toLowerCase() || "openai";
}

export function getAnswerGenerator({ env = process.env, createClient } = {}) {
  const mode = getAnswerGenerationMode(env);

  if (mode === "stub") {
    return createStubAnswerGenerator();
  }

  if (mode === "openrouter") {
    return getConfiguredOpenRouterAnswerGenerator({ env, createClient });
  }

  return getConfiguredAnswerGenerator({ env, createClient });
}
