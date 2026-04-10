import { NextResponse } from "next/server";
import path from "node:path";

import { handleAskRequest } from "@/server/api/ask.js";
import { getAnswerGenerator } from "@/server/answer/index.js";

const notesPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "notes.json");
const generateAnswer = getAnswerGenerator();

export async function POST(request: Request) {
  const body = await request.json();

  const result = await handleAskRequest({
    body,
    generateAnswer,
    notesPath,
  });

  return NextResponse.json(result.json, { status: result.status });
}
