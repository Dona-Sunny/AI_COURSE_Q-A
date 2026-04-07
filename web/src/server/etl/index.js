import { STOPWORDS } from "./stopwords.js";

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
