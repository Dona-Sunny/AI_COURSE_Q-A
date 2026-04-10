import OpenAI from "openai";

import { AnswerGenerationConfigError } from "./errors.js";

function formatContext(context) {
  return context
    .map((chunk, index) => `Source ${index + 1}:\n${chunk}`)
    .join("\n\n");
}

function extractMessageContent(messageContent) {
  if (typeof messageContent === "string") {
    return messageContent.trim();
  }

  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part?.type === "text") {
          return part.text;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

export function getOpenRouterConfig(env = process.env) {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  const model = env.OPENROUTER_MODEL?.trim() || "openrouter/free";
  const siteUrl = env.OPENROUTER_SITE_URL?.trim();
  const appName = env.OPENROUTER_APP_NAME?.trim();

  if (!apiKey) {
    throw new AnswerGenerationConfigError(
      "Missing OPENROUTER_API_KEY. Set OPENROUTER_API_KEY to enable grounded answers with OpenRouter."
    );
  }

  return {
    apiKey,
    model,
    siteUrl,
    appName,
  };
}

export function createOpenRouterAnswerGenerator({
  apiKey,
  model,
  siteUrl,
  appName,
  createClient = (options) => new OpenAI(options),
}) {
  const defaultHeaders = {};

  if (siteUrl) {
    defaultHeaders["HTTP-Referer"] = siteUrl;
  }

  if (appName) {
    defaultHeaders["X-OpenRouter-Title"] = appName;
  }

  const client = createClient({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders,
  });

  return async function generateAnswer(context, question, meta) {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You answer only from the provided AI course notes. Be concise, student-friendly, and do not add facts that are not supported by the sources.",
        },
        {
          role: "user",
          content: [
            `Support level: ${meta.supportLevel}`,
            `Question: ${question}`,
            "Course note context:",
            formatContext(context),
          ].join("\n\n"),
        },
      ],
    });

    const answer = extractMessageContent(response.choices?.[0]?.message?.content);

    if (!answer) {
      throw new Error("OpenRouter returned an empty answer.");
    }

    return answer;
  };
}

export function getConfiguredOpenRouterAnswerGenerator({
  env = process.env,
  createClient,
} = {}) {
  let generator;

  return async function generateAnswer(context, question, meta) {
    if (!generator) {
      const { apiKey, model, siteUrl, appName } = getOpenRouterConfig(env);
      generator = createOpenRouterAnswerGenerator({
        apiKey,
        model,
        siteUrl,
        appName,
        createClient,
      });
    }

    return generator(context, question, meta);
  };
}
