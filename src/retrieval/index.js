import { tokenize } from "../etl/index.js";

export function scoreChunk(tokens, queryTokens) {
  const tokenSet = new Set(tokens);
  const matchedTerms = [...new Set(queryTokens.filter((token) => tokenSet.has(token)))];

  return {
    score: matchedTerms.length,
    matchedTerms
  };
}

export function classifySupport(results) {
  const supportedResults = results.filter((result) => result.score > 0);

  if (supportedResults.length === 0) {
    return "none";
  }

  const substantialResults = supportedResults.filter((result) => result.score >= 2);

  const matchedTermsAcrossChunks = new Set();

  for (const result of substantialResults) {
    for (const term of result.matchedTerms) {
      matchedTermsAcrossChunks.add(term);
    }
  }

  if (matchedTermsAcrossChunks.size >= 2 && substantialResults.length >= 2) {
    return "strong";
  }

  return "partial";
}

export function retrieveRelevantChunks(notes, question, options = {}) {
  const limit = options.limit ?? 3;
  const queryTokens = tokenize(question);

  const rankedResults = notes
    .map((chunk) => {
      const { score, matchedTerms } = scoreChunk(chunk.tokens ?? [], queryTokens);

      return {
        ...chunk,
        score,
        matchedTerms
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.chunkId.localeCompare(right.chunkId);
    })
    .slice(0, limit);

  return {
    question,
    queryTokens,
    supportLevel: classifySupport(rankedResults),
    results: rankedResults
  };
}
