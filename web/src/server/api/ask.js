import { routeQuestion } from "../ask/index.js";
import { AnswerGenerationConfigError } from "../answer/errors.js";
import { loadNotes } from "../notes/index.js";
import { retrieveRelevantChunks } from "../retrieval/index.js";

function isQuotaError(error) {
  return error?.status === 429 || error?.code === "insufficient_quota" || error?.type === "insufficient_quota";
}

export async function handleAskRequest({ body, generateAnswer, notesPath }) {
  const question = body?.question?.trim();

  if (!question) {
    return {
      status: 400,
      json: {
        error: "A question is required.",
      },
    };
  }

  try {
    const notes = await loadNotes(notesPath);
    const retrievalResult = retrieveRelevantChunks(notes, question);
    const routed = await routeQuestion({ retrievalResult, generateAnswer });

    return {
      status: 200,
      json: routed,
    };
  } catch (error) {
    if (error instanceof AnswerGenerationConfigError) {
      return {
        status: 500,
        json: {
          // Surface provider configuration problems clearly so deployment issues
          // fail fast instead of looking like note-loading failures.
          error: error.message,
        },
      };
    }

    if (isQuotaError(error)) {
      return {
        status: 503,
        json: {
          error:
            "Answer generation is temporarily unavailable because the configured model provider is out of quota or rate-limited. Please try again later.",
        },
      };
    }

    return {
      status: 500,
      json: {
        error: "Course notes are currently unavailable.",
      },
    };
  }
}
