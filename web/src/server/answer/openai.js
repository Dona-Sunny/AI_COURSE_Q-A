import OpenAI from "openai";
import { AnswerGenerationConfigError } from "./errors.js";

export { AnswerGenerationConfigError } from "./errors.js";

function formatContext(context) {
  return context
    .map((chunk, index) => `Source ${index + 1}:\n${chunk}`)
    .join("\n\n");
}

export function getOpenAIConfig(env = process.env) {
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = env.OPENAI_MODEL?.trim();

  if (!apiKey) {
    throw new AnswerGenerationConfigError(
      "Missing OPENAI_API_KEY. Set OPENAI_API_KEY to enable grounded answers."
    );
  }

  if (!model) {
    throw new AnswerGenerationConfigError(
      "Missing OPENAI_MODEL. Set OPENAI_MODEL to enable grounded answers."
    );
  }

  return { apiKey, model };
}

export function createOpenAIAnswerGenerator({
  apiKey,
  model,
  createClient = (options) => new OpenAI(options),
}) {
  const client = createClient({ apiKey });

  return async function generateAnswer(context, question, meta) {
    const response = await client.responses.create({
      model,
      instructions:
        "You answer only from the provided AI course notes. Be concise, student-friendly, and do not add facts that are not supported by the sources.",
      input: [
        `Support level: ${meta.supportLevel}`,
        `Question: ${question}`,
        "Course note context:",
        formatContext(context),
      ].join("\n\n"),
    });

    const answer = response.output_text?.trim();

    if (!answer) {
      throw new Error("OpenAI returned an empty answer.");
    }

    return answer;
  };
}

export function getConfiguredAnswerGenerator({
  env = process.env,
  createClient,
} = {}) {
  let generator;

  return async function generateAnswer(context, question, meta) {
    if (!generator) {
      const { apiKey, model } = getOpenAIConfig(env);
      generator = createOpenAIAnswerGenerator({
        apiKey,
        model,
        createClient,
      });
    }

    return generator(context, question, meta);
  };
}
