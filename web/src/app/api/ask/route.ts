import { NextResponse } from "next/server";
import path from "node:path";

import { handleAskRequest } from "@/server/api/ask.js";

const notesPath = path.join(process.cwd(), "data", "notes.json");

async function generateAnswer(
  context: string[],
  question: string,
  meta: { supportLevel: "none" | "partial" | "strong" }
) {
  return `Stub answer for "${question}" with support level "${meta.supportLevel}".`;
}

export async function POST(request: Request) {
  const body = await request.json();

  const result = await handleAskRequest({
    body,
    generateAnswer,
    notesPath,
  });

  return NextResponse.json(result.json, { status: result.status });
}
