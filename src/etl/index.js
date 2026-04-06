import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { STOPWORDS } from "./stopwords.js";

function isHeadingOnlyParagraph(paragraph) {
  return /^#{1,6}\s+[^\r\n.!?]+$/.test(paragraph);
}

export function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text) {
  return normalizeText(text)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token));
}

export function splitIntoParagraphs(text) {
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/g)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return paragraphs.reduce((merged, paragraph) => {
    if (isHeadingOnlyParagraph(paragraph) && merged.length === 0) {
      merged.push(paragraph);
      return merged;
    }

    if (merged.length > 0 && isHeadingOnlyParagraph(merged[merged.length - 1])) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${paragraph}`;
      return merged;
    }

    merged.push(paragraph);
    return merged;
  }, []);
}

export function createChunks(paragraphs, options = {}) {
  const maxChars = options.maxChars ?? 220;
  const overlap = options.overlap ?? 1;
  const chunks = [];
  let current = [];
  let currentLength = 0;

  for (const paragraph of paragraphs) {
    const projectedLength = currentLength + paragraph.length + (current.length > 0 ? 1 : 0);

    if (current.length > 0 && projectedLength > maxChars) {
      chunks.push(current.join("\n\n"));
      current = overlap > 0 ? current.slice(-overlap) : [];
      currentLength = current.join("\n\n").length;
    }

    current.push(paragraph);
    currentLength = current.join("\n\n").length;
  }

  if (current.length > 0) {
    chunks.push(current.join("\n\n"));
  }

  return chunks;
}

export function buildChunkRecords(documentId, documentTitle, text, options = {}) {
  const paragraphs = splitIntoParagraphs(text);
  const chunks = createChunks(paragraphs, options);

  return chunks.map((chunkText, index) => ({
    documentId,
    documentTitle,
    chunkId: `${documentId}-chunk-${index + 1}`,
    text: chunkText,
    normalizedText: normalizeText(chunkText),
    tokens: tokenize(chunkText)
  }));
}

export async function buildNotesArtifact({ inputPath, outputPath, documentId, documentTitle, chunkOptions }) {
  const rawText = await readFile(inputPath, "utf8");
  const records = buildChunkRecords(documentId, documentTitle, rawText, chunkOptions);
  const serialized = JSON.stringify(records, null, 2);

  await writeFile(outputPath, `${serialized}\n`, "utf8");

  return records;
}

export function resolveProjectPath(...segments) {
  return path.resolve(process.cwd(), ...segments);
}
