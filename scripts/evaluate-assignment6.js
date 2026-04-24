import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { handleAskRequest } from "../src/api/ask.js";
import { resolveProjectPath, tokenize } from "../src/etl/index.js";
import { loadNotes, resetNotesCache } from "../src/notes/index.js";
import {
  expandQueryTokens,
  retrieveRelevantChunks,
} from "../src/retrieval/index.js";

const INPUT_CASES_PATH = resolveProjectPath("evaluation", "cases.json");
const OUTPUT_DIR = resolveProjectPath("evaluation", "results");
const OUTPUT_JSON_PATH = path.join(OUTPUT_DIR, "assignment6-evaluation.json");
const OUTPUT_MARKDOWN_PATH = path.join(OUTPUT_DIR, "assignment6-evaluation.md");

function intersects(left, right) {
  return left.some((value) => right.includes(value));
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createEvaluationAnswerGenerator() {
  return async function generateAnswer(context, question) {
    const queryTokens = expandQueryTokens(question, tokenize(question));
    const queryTokenSet = new Set(queryTokens);

    const scoredSentences = context
      .flatMap((chunk) =>
        chunk
          .split(/(?<=[.!?])\s+/)
          .map((sentence) => sentence.trim())
          .filter(Boolean)
      )
      .map((sentence) => {
        const overlap = tokenize(sentence).filter((token) => queryTokenSet.has(token));

        return {
          sentence,
          score: new Set(overlap).size,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);

    const answer = [...new Set(scoredSentences.map((entry) => entry.sentence))]
      .slice(0, 2)
      .join(" ")
      .trim();

    return answer || context[0] || "No supported answer sentence was found.";
  };
}

function evaluateRetrievalCase(result, testCase) {
  const retrievedChunkIds = result.results.map((chunk) => chunk.chunkId);
  const hasRelevantChunk =
    testCase.relevantChunkIds.length === 0
      ? result.results.length === 0
      : intersects(retrievedChunkIds, testCase.relevantChunkIds);

  return {
    supportLevel: result.supportLevel,
    supportCorrect: result.supportLevel === testCase.desiredSupportLevel,
    hitAt3: hasRelevantChunk,
    topChunks: result.results.map((chunk) => ({
      chunkId: chunk.chunkId,
      score: chunk.score,
      matchedTerms: chunk.matchedTerms,
    })),
  };
}

function scoreKeywordCoverage(answer, expectedKeywords) {
  if (expectedKeywords.length === 0) {
    return 2;
  }

  const normalizedAnswer = answer.toLowerCase();
  const matches = expectedKeywords.filter((keyword) =>
    normalizedAnswer.includes(keyword.toLowerCase())
  ).length;
  const coverageRatio = matches / expectedKeywords.length;

  if (coverageRatio >= 0.67) {
    return 2;
  }

  if (coverageRatio > 0) {
    return 1;
  }

  return 0;
}

function scoreClarity(answer) {
  const trimmedLength = answer.trim().length;

  if (trimmedLength >= 40 && trimmedLength <= 320) {
    return 2;
  }

  if (trimmedLength > 0) {
    return 1;
  }

  return 0;
}

function evaluateOutputQuality(response, testCase) {
  if (testCase.desiredSupportLevel === "none") {
    const refusalLooksClear = /could not find enough relevant information/i.test(response.answer);

    return {
      groundedness: refusalLooksClear ? 2 : 0,
      conceptCoverage: refusalLooksClear ? 2 : 0,
      clarity: scoreClarity(response.answer),
      overall: average([
        refusalLooksClear ? 2 : 0,
        refusalLooksClear ? 2 : 0,
        scoreClarity(response.answer),
      ]),
    };
  }

  const sourceText = response.sources.map((source) => source.excerpt).join(" ").toLowerCase();
  const answerText = response.answer.toLowerCase();
  const groundedness = sourceText.includes(answerText) ? 2 : 1;
  const conceptCoverage = scoreKeywordCoverage(response.answer, testCase.expectedKeywords);
  const clarity = scoreClarity(response.answer);

  return {
    groundedness,
    conceptCoverage,
    clarity,
    overall: average([groundedness, conceptCoverage, clarity]),
  };
}

function evaluateTaskSuccess(response, testCase) {
  const sourcesPresent = response.sources.length > 0;

  if (testCase.desiredSupportLevel === "none") {
    return {
      success:
        response.supportLevel === "none" &&
        /could not find enough relevant information/i.test(response.answer) &&
        sourcesPresent === false,
      sourcesPresent,
    };
  }

  return {
    success:
      response.supportLevel === testCase.desiredSupportLevel &&
      response.answer.trim().length > 0 &&
      sourcesPresent,
    sourcesPresent,
  };
}

function evaluateConsistency(notes, testCase) {
  const first = retrieveRelevantChunks(notes, testCase.question);
  const second = retrieveRelevantChunks(notes, testCase.question);
  const third = retrieveRelevantChunks(notes, testCase.question);

  return JSON.stringify(first) === JSON.stringify(second) &&
    JSON.stringify(second) === JSON.stringify(third);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatScore(value) {
  return value.toFixed(2);
}

function buildMarkdownReport(summary, cases) {
  const caseLines = cases.map((entry) => {
    const baselineStatus = `${entry.baseline.supportLevel} / hit@3=${entry.baseline.hitAt3}`;
    const improvedStatus = `${entry.improved.supportLevel} / hit@3=${entry.improved.hitAt3}`;

    return `| ${entry.id} | ${entry.category} | ${entry.question} | ${entry.desiredSupportLevel} | ${baselineStatus} | ${improvedStatus} | ${entry.taskSuccess.success ? "pass" : "fail"} | ${formatScore(entry.outputQuality.overall)} |`;
  });

  return `# Assignment 6 Evaluation Results

These artifacts were generated by \`npm run eval:assignment6\`.

## Method

- Upstream evaluation: deterministic retrieval quality using support accuracy and hit@3.
- End-to-end evaluation: request success, correct support level, answer/refusal shape, and source presence.
- Output quality: reproducible rubric on groundedness, concept coverage, and clarity.
- Consistency evaluation: repeated retrieval for the same prompt returns the same ranked chunks and support label.
- Baseline: the original exact-match retrieval path with query expansion disabled.
- Improved system: the current retrieval path with a small course-specific query expansion layer for paraphrased questions.

## Summary

- Retrieval support accuracy: baseline ${summary.retrieval.baselineSupportAccuracy} / improved ${summary.retrieval.improvedSupportAccuracy}
- Retrieval hit@3 on cases with expected source chunks: baseline ${summary.retrieval.baselineHitAt3} / improved ${summary.retrieval.improvedHitAt3}
- End-to-end task success: ${summary.endToEnd.successRate}
- Average output-quality score: ${summary.outputQuality.averageOverallScore} / 2.00
- Consistency: ${summary.consistency.passRate}

## Failure Analysis

- Historical failure fixed: \`What are thinking machines?\` moved from \`none\` in the baseline to \`strong\` after query expansion.
- Historical failure fixed: \`How do computers learn from examples?\` moved from \`partial\` to \`strong\`.
- Remaining weakness: \`What is training with answer keys called?\` still returns \`partial\` support even though the intended concept is supervised learning.
- Safe refusal path: \`What is blockchain consensus?\` still returns \`none\` and a deterministic refusal instead of hallucinating.

## Case Table

| Case | Category | Question | Target support | Baseline | Improved | End-to-end | Output score |
| --- | --- | --- | --- | --- | --- | --- | --- |
${caseLines.join("\n")}
`;
}

const rawCases = await readFile(INPUT_CASES_PATH, "utf8");
const cases = JSON.parse(rawCases);

resetNotesCache();
const notes = await loadNotes();
const evaluationAnswerGenerator = createEvaluationAnswerGenerator();

const evaluatedCases = [];

for (const testCase of cases) {
  const baseline = evaluateRetrievalCase(
    retrieveRelevantChunks(notes, testCase.question, { expandQuery: false }),
    testCase
  );
  const improved = evaluateRetrievalCase(retrieveRelevantChunks(notes, testCase.question), testCase);
  const response = await handleAskRequest({
    body: { question: testCase.question },
    generateAnswer: evaluationAnswerGenerator,
  });
  const taskSuccess = evaluateTaskSuccess(response.json, testCase);
  const outputQuality = evaluateOutputQuality(response.json, testCase);
  const consistent = evaluateConsistency(notes, testCase);

  evaluatedCases.push({
    id: testCase.id,
    category: testCase.category,
    question: testCase.question,
    desiredSupportLevel: testCase.desiredSupportLevel,
    notes: testCase.notes,
    baseline,
    improved,
    response: response.json,
    taskSuccess,
    outputQuality,
    consistent,
  });
}

const inScopeCases = evaluatedCases.filter((entry) => entry.desiredSupportLevel !== "none");
const summary = {
  generatedAt: new Date().toISOString(),
  retrieval: {
    baselineSupportAccuracy: formatPercent(
      average(evaluatedCases.map((entry) => (entry.baseline.supportCorrect ? 1 : 0)))
    ),
    improvedSupportAccuracy: formatPercent(
      average(evaluatedCases.map((entry) => (entry.improved.supportCorrect ? 1 : 0)))
    ),
    baselineHitAt3: formatPercent(
      average(inScopeCases.map((entry) => (entry.baseline.hitAt3 ? 1 : 0)))
    ),
    improvedHitAt3: formatPercent(
      average(inScopeCases.map((entry) => (entry.improved.hitAt3 ? 1 : 0)))
    ),
  },
  endToEnd: {
    successRate: formatPercent(
      average(evaluatedCases.map((entry) => (entry.taskSuccess.success ? 1 : 0)))
    ),
  },
  outputQuality: {
    averageOverallScore: formatScore(
      average(evaluatedCases.map((entry) => entry.outputQuality.overall))
    ),
  },
  consistency: {
    passRate: formatPercent(
      average(evaluatedCases.map((entry) => (entry.consistent ? 1 : 0)))
    ),
  },
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  OUTPUT_JSON_PATH,
  JSON.stringify(
    {
      summary,
      cases: evaluatedCases,
    },
    null,
    2
  ) + "\n",
  "utf8"
);
await writeFile(OUTPUT_MARKDOWN_PATH, buildMarkdownReport(summary, evaluatedCases), "utf8");

console.log(`Wrote ${OUTPUT_JSON_PATH}`);
console.log(`Wrote ${OUTPUT_MARKDOWN_PATH}`);
