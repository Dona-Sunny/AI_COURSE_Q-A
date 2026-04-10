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

  // Keep markdown headings attached to the next paragraph so chunking does not
  // separate a section title from the explanation it introduces.
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
      // Reuse the trailing paragraphs to keep neighboring chunks slightly overlapped.
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
    tokens: tokenize(chunkText),
  }));
}

export function serializeNotesArtifact(records) {
  return `${JSON.stringify(records, null, 2)}\n`;
}

async function generateArtifactRecords({ inputPath, documentId, documentTitle, chunkOptions }) {
  const rawText = await readFile(inputPath, "utf8");
  return buildChunkRecords(documentId, documentTitle, rawText, chunkOptions);
}

export async function buildNotesArtifact({ inputPath, outputPath, documentId, documentTitle, chunkOptions }) {
  const records = await generateArtifactRecords({
    inputPath,
    documentId,
    documentTitle,
    chunkOptions,
  });
  const serialized = serializeNotesArtifact(records);

  await writeFile(outputPath, serialized, "utf8");

  return records;
}

export async function verifyNotesArtifact({
  inputPath,
  outputPath,
  documentId,
  documentTitle,
  chunkOptions,
}) {
  const records = await generateArtifactRecords({
    inputPath,
    documentId,
    documentTitle,
    chunkOptions,
  });
  const expected = serializeNotesArtifact(records);
  let actual;

  try {
    actual = await readFile(outputPath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        ok: false,
        reason: "missing",
        message: "Processed notes artifact is missing. Run npm run etl:build.",
      };
    }

    throw error;
  }

  if (actual === expected) {
    return {
        ok: true,
        reason: "in-sync",
        message: "Processed notes artifact is in sync.",
      };
  }

  return {
    ok: false,
    reason: "out-of-sync",
    message: "Processed notes artifact is out of date. Run npm run etl:build.",
    expected,
    actual,
  };
}

export function resolveProjectPath(...segments) {
  return path.resolve(process.cwd(), ...segments);
}
