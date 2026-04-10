import { readFile } from "node:fs/promises";
import path from "node:path";

let cachedNotes = null;
let cachedPath = null;

export function resolveNotesPath(customPath) {
  return customPath ?? path.resolve(/*turbopackIgnore: true*/ process.cwd(), "data", "notes.json");
}

export function resetNotesCache() {
  cachedNotes = null;
  cachedPath = null;
}

export async function loadNotes(customPath) {
  const resolvedPath = resolveNotesPath(customPath);

  if (cachedNotes && cachedPath === resolvedPath) {
    return cachedNotes;
  }

  const raw = await readFile(resolvedPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Processed notes must be a JSON array.");
  }

  cachedNotes = parsed;
  cachedPath = resolvedPath;

  return parsed;
}
