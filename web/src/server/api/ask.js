import { routeQuestion } from "../ask/index.js";
import { loadNotes } from "../notes/index.js";
import { retrieveRelevantChunks } from "../retrieval/index.js";

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
  } catch {
    return {
      status: 500,
      json: {
        error: "Course notes are currently unavailable.",
      },
    };
  }
}
