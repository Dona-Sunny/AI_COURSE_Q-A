import { getConfiguredAnswerGenerator } from "./openai.js";

function createStubAnswerGenerator() {
  return async function generateAnswer(_context, question, meta) {
    return `Stub answer for "${question}" with support level "${meta.supportLevel}".`;
  };
}

export function getAnswerGenerationMode(env = process.env) {
  return env.ANSWER_GENERATION_MODE?.trim().toLowerCase() || "openai";
}

export function getAnswerGenerator({ env = process.env, createClient } = {}) {
  if (getAnswerGenerationMode(env) === "stub") {
    return createStubAnswerGenerator();
  }

  return getConfiguredAnswerGenerator({ env, createClient });
}
