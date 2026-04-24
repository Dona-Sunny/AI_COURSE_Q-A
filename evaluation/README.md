# Evaluation Artifacts

This folder contains the Assignment 6 evaluation cases, generated results, and
the baseline-vs-improved comparison for the AI Course Notes Q&A app.

## Files

- [cases.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\cases.json)
  stores the fixed representative and failure cases used in the evaluation.
- [assignment6-evaluation.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\results\assignment6-evaluation.json)
  stores the detailed machine-readable results.
- [assignment6-evaluation.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\results\assignment6-evaluation.md)
  stores the summary used for Assignment 6 discussion.

## How To Re-run

```powershell
npm run eval:assignment6
```

## What Is Measured

- Upstream retrieval quality:
  support-label accuracy and hit@3 against expected relevant chunks.
- End-to-end task success:
  whether the full ask flow returns the expected support level, answer or refusal,
  and sources.
- Output quality:
  a reproducible rubric covering groundedness, concept coverage, and clarity.
- Consistency:
  repeated retrieval runs for the same question should return identical support
  labels and ranked chunks.

## Baseline

The lightweight baseline is the original exact-match retrieval behavior with
query expansion disabled:

- baseline: `retrieveRelevantChunks(notes, question, { expandQuery: false })`
- improved system: `retrieveRelevantChunks(notes, question)` with the current
  course-specific query expansion enabled

## Reproducibility Note

The repo evaluation uses a deterministic local answer generator so the saved
artifacts do not depend on provider quota, network access, or non-deterministic
LLM phrasing. The live Vercel walkthrough can still show the provider-backed
answer layer for the final demo.
