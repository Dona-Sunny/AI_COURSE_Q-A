import { normalizeText, tokenize } from "../etl/index.js";

const QUERY_TOKEN_ALIASES = new Map([
  ["thinking", ["intelligence"]],
  ["smart", ["intelligence"]],
  ["machines", ["systems"]],
  ["computers", ["systems"]],
  ["computer", ["systems"]],
  ["examples", ["data", "labeled"]],
  ["example", ["data", "labeled"]],
  ["layered", ["layers"]],
]);

const QUERY_PHRASE_EXPANSIONS = [
  {
    phrase: "thinking machines",
    expansions: ["artificial", "intelligence", "systems"],
  },
  {
    phrase: "smart systems",
    expansions: ["artificial", "intelligence", "systems"],
  },
  {
    phrase: "learn from examples",
    expansions: ["machine", "learning", "data"],
  },
  {
    phrase: "learning from examples",
    expansions: ["supervised", "learning", "labeled", "data"],
  },
  {
    phrase: "brain inspired",
    expansions: ["neural", "networks"],
  },
  {
    phrase: "brain like",
    expansions: ["neural", "networks"],
  },
  {
    phrase: "layered representation learning",
    expansions: ["deep", "learning", "layers"],
  },
];

export function expandQueryTokens(question, queryTokens) {
  const expandedTokens = [...queryTokens];
  const normalizedQuestion = normalizeText(question);

  for (const token of queryTokens) {
    for (const alias of QUERY_TOKEN_ALIASES.get(token) ?? []) {
      expandedTokens.push(alias);
    }
  }

  for (const { phrase, expansions } of QUERY_PHRASE_EXPANSIONS) {
    if (!normalizedQuestion.includes(phrase)) {
      continue;
    }

    expandedTokens.push(...expansions);
  }

  return [...new Set(expandedTokens)];
}

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
  const baseQueryTokens = tokenize(question);
  const queryTokens =
    options.expandQuery === false
      ? baseQueryTokens
      : expandQueryTokens(question, baseQueryTokens);

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
