# AI Course Notes Q&A

AI Course Notes Q&A is a small Next.js study app that lets a student ask plain-English questions about one bundled AI course note set and get grounded answers with source excerpts.

This repository is intentionally scoped as a course-project proof of concept rather than a production-scale platform.

Live app:
- `https://web-pink-two-52.vercel.app`

Public repository:
- `https://github.com/Dona-Sunny/AI_COURSE_Q-A`

## Assignment 6 status

This repository now includes the extra evidence expected for Assignment 6:

- architecture classification and tradeoff discussion
- a clear pipeline and data-flow explanation
- saved evaluation cases in [cases.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\cases.json)
- generated evaluation results in [assignment6-evaluation.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\results\assignment6-evaluation.md)
- one lightweight baseline comparison
- two failure cases
- one evidence-based system improvement
- a video outline in [assignment6-video-outline.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\docs\assignment6-video-outline.md)

## What the app does

- accepts a single course question at a time
- retrieves the most relevant note chunks from curated course notes
- classifies support as `none`, `partial`, or `strong`
- uses that support level as a deterministic routing rule
- returns an answer plus source excerpts
- refuses unsupported questions instead of guessing

## What the app does not support

- multi-turn chat memory
- user uploads
- PDF ingestion in the MVP
- generalized document chat beyond the bundled AI course notes
- vector search or embeddings in the MVP

## Architecture

This POC keeps the architecture intentionally simple:

1. Raw course notes are stored in [ai-course-notes.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\data\raw\ai-course-notes.md).
2. ETL normalizes, chunks, and enriches that source into the curated artifact [notes.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\data\notes.json).
3. The server loads the curated artifact as the runtime source of truth.
4. Retrieval ranks chunks with deterministic keyword overlap scoring.
5. Support routing decides whether to refuse, return a limited answer, or generate a normal grounded answer.
6. The Next.js app on Vercel renders the chat UI and calls `/api/ask`.

Core boundaries:
- ETL: [index.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\src\etl\index.js)
- Retrieval: [index.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\src\retrieval\index.js)
- Support routing: [index.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\src\ask\index.js)
- API contract: [ask.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\src\api\ask.js)
- Next route wrapper: [route.ts](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\web\src\app\api\ask\route.ts)
- Chat UI: [chat-page.tsx](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\web\src\app\chat-page.tsx)

## Assignment 6 architecture classification

For Assignment 6, the best-fit architecture label is `retrieval-first / RAG`.

Why this label fits:
- the app does not place the entire note set into the prompt on every request
- it first retrieves a small set of relevant note chunks
- the retrieved context controls the answer step
- unsupported questions are refused based on retrieval support instead of prompt wording alone

Main alternative considered:
- `prompt-first / long-context`

Why prompt-first was not chosen:
- it would be simpler for one small note file
- but it would be harder to debug why a specific answer was produced
- it would make refusal behavior less deterministic
- it would scale worse if more notes or documents are added later

Required tradeoffs:
- amount of data / number of files:
  today the dataset is small, so prompt-first could work, but retrieval becomes more valuable as notes grow
- context-window limits:
  retrieval keeps the prompt small and stable instead of sending the whole note set each time
- retrieval or storage needs:
  this app uses a lightweight JSON artifact instead of a vector store or database
- determinism needs:
  deterministic retrieval and support routing make failure behavior easier to test
- cost:
  retrieval reduces unnecessary model context and skips model calls for `none` support
- operational overhead:
  ETL and artifact verification add complexity compared with a one-prompt baseline
- performance:
  keyword retrieval over a small JSON artifact is fast and cheap
- ease of debugging:
  retrieved chunks, support level, and sources are inspectable, so failures are easier to explain

Important capability not implemented:
- embeddings / vector retrieval

Would it help:
- yes, especially for paraphrased questions and semantic matches

What problem it would solve:
- exact keywords miss some in-scope questions when the user uses different wording than the notes

What new complexity it would introduce:
- embedding generation
- vector storage or indexing
- extra cost
- more operational overhead
- harder debugging than exact-match retrieval

When it should be adopted:
- when the note set grows larger
- when paraphrase failures become more common
- when keyword overlap is no longer enough for acceptable recall

## Data and storage

This project uses curated files rather than a database or vector store.

- Bronze-style raw input: [ai-course-notes.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\data\raw\ai-course-notes.md)
- Gold-style runtime artifact: [notes.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\data\notes.json)
- Next.js runtime mirror: [web/data/notes.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\web\data\notes.json)

For this assignment, that file-based storage is intentional. The goal is to prove the workflow clearly, not build infrastructure for scale.

The canonical processed note artifact is regenerated from the raw markdown and then
mirrored into the Next.js runtime folder by [build-notes.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\scripts\build-notes.js).
Verification checks both copies by [verify-notes-artifact.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\scripts\verify-notes-artifact.js).

## Pipeline and data flow

Raw input:
- bundled markdown notes in [ai-course-notes.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\data\raw\ai-course-notes.md)

Transformation:
- ETL normalizes text, removes stopwords, keeps headings with their section text, and builds chunk records in [src/etl/index.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\src\etl\index.js)

Stored artifacts:
- processed chunk records in [data/notes.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\data\notes.json)
- mirrored runtime artifact in [web/data/notes.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\web\data\notes.json)

Runtime source of truth:
- the processed note artifact, loaded by [src/notes/index.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\src\notes\index.js) and the Next.js mirror in [web/src/server/notes/index.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\web\src\server\notes\index.js)

Where errors can happen:
- raw note parsing or artifact drift during ETL
- malformed or missing processed artifact at runtime
- retrieval returning weak support for paraphrased questions
- provider configuration or quota errors during answer generation
- client-side network or UI display errors

Internal information worth keeping for debugging and evaluation:
- prompt inputs in the answer-generation layer
- selected provider mode and model
- query tokens and matched terms in retrieval
- support level (`none`, `partial`, `strong`)
- transformed chunk records and stored JSON artifacts
- saved evaluation cases and generated evaluation results

## AI / reasoning layer

The app uses a simple RAG-style workflow with deterministic routing:

- retrieval: deterministic keyword matching over curated note chunks
- reasoning guardrail: support classification (`none`, `partial`, `strong`)
- answer generation: provider-backed answer generation only when support exists

The deployed app currently uses OpenRouter's free router path in production:
- `ANSWER_GENERATION_MODE=openrouter`
- `OPENROUTER_MODEL=openrouter/free`

The codebase also includes:
- `stub` mode for deterministic testing/demo flows
- `openai` mode for a direct OpenAI-backed path

## Assignment 6 evaluation artifacts

Saved evaluation artifacts:
- case set: [cases.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\cases.json)
- evaluation guide: [evaluation/README.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\README.md)
- generated results: [assignment6-evaluation.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\results\assignment6-evaluation.md)
- machine-readable output: [assignment6-evaluation.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\results\assignment6-evaluation.json)

The evaluation covers:
- output quality
- end-to-end task success
- one upstream component: retrieval
- consistency of the deterministic retrieval path
- 5 representative cases
- 2 failure cases
- 1 lightweight baseline

Explicit evaluation cases used:
- representative case 1: `What is machine learning?`
- representative case 2: `What is supervised learning?`
- representative case 3: `Explain neural networks.`
- representative case 4: `What are thinking machines?`
- representative case 5: `How do computers learn from examples?`
- failure case 1: `What is blockchain consensus?`
- failure case 2: `What is training with answer keys called?`

Explicit lightweight baseline used:
- baseline system:
  the original exact-match retrieval behavior with query expansion disabled
- baseline implementation:
  `retrieveRelevantChunks(notes, question, { expandQuery: false })`
- comparison target:
  the improved retrieval path with course-specific query expansion enabled
- why this baseline is lightweight:
  it is not a second full app, only the earlier simpler retrieval behavior inside the same application

These cases are saved in [cases.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\cases.json) and the generated results are summarized in [assignment6-evaluation.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\evaluation\results\assignment6-evaluation.md).

Current evaluation summary:
- retrieval support accuracy improved from `57.1%` to `85.7%`
- retrieval hit@3 improved from `83.3%` to `100.0%`
- end-to-end task success is `85.7%`
- average output-quality score is `1.62 / 2.00`
- repeated retrieval consistency is `100.0%`

The lightweight baseline is the original exact-match retrieval behavior with query expansion disabled.
The improved system uses the current retrieval path with course-specific query expansion enabled.

Re-run the saved evaluation:

```powershell
npm run eval:assignment6
```

## Evidence-based improvement

Assignment 6 requires at least one meaningful improvement based on evidence.
The improvement implemented here is a small query-expansion layer in:

- [src/retrieval/index.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\src\retrieval\index.js)
- [web/src/server/retrieval/index.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\web\src\server\retrieval\index.js)

What looked weak before:
- the original exact-match retrieval underperformed on natural paraphrases such as
  `What are thinking machines?`
  and
  `How do computers learn from examples?`

What evidence showed that:
- baseline support accuracy was only `57.1%`
- one paraphrase returned `none`
- another paraphrase returned only `partial`

What changed:
- the retrieval layer now expands a small set of course-specific paraphrases before scoring chunks

What improved:
- `What are thinking machines?` moved from `none` to `strong`
- `How do computers learn from examples?` moved from `partial` to `strong`
- overall support accuracy and hit@3 improved in the saved evaluation report

What remains weak:
- `What is training with answer keys called?` still returns `partial` support
- this is the clearest remaining argument for future embeddings or vector retrieval

## TDD and testing evidence

Meaningful TDD was used on the core slices:
- ETL
- retrieval
- deterministic support routing
- `/api/ask` contract
- chat UI behaviors
- provider/runtime answer-generation behavior

Core behavior tests:
- [etl.test.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\test\etl.test.js)
- [etl-verification.test.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\test\etl-verification.test.js)
- [retrieval.test.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\test\retrieval.test.js)
- [support-routing.test.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\test\support-routing.test.js)
- [api-ask.test.js](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\test\api-ask.test.js)

UI and provider tests:
- [page.test.tsx](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\web\src\app\page.test.tsx)
- [ask.test.ts](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\web\src\server\api\ask.test.ts)
- [openai.test.ts](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\web\src\server\answer\openai.test.ts)
- [openrouter.test.ts](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\web\src\server\answer\openrouter.test.ts)

Browser-based end-to-end tests:
- [supported-question.spec.ts](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\e2e\supported-question.spec.ts)
- [unsupported-question.spec.ts](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\e2e\unsupported-question.spec.ts)
- Playwright config: [playwright.config.ts](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\playwright.config.ts)

Playwright MCP was also used during development to verify:
- supported question flow
- unsupported question refusal flow
- deployed production behavior

## CI and ETL reproducibility

GitHub Actions validates the app with:
- artifact reproducibility
- root logic tests
- web component tests
- Playwright e2e tests

Workflow:
- [ci.yml](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\.github\workflows\ci.yml)

Useful scripts:

```powershell
npm run etl:build
npm run etl:verify
npm run eval:assignment6
npm test
npm run test:web
npm run test:e2e
```

## Architecture improvement evidence

The required before/after architecture note is here:
- [architecture-improvement-note.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\docs\architecture-improvement-note.md)

That note explains how the project moved from early working slices toward clearer deep-module boundaries and thinner framework glue.

## PRD and GitHub issues

PRD:
- [PRD-ai-course-notes-qa.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\docs\PRD-ai-course-notes-qa.md)

GitHub issue workflow used:
- `#2` ETL Pipeline for Bundled Course Notes
- `#3` Retrieval Engine
- `#4` Deterministic Support Routing
- `#6` `/api/ask Contract`
- `#7` Chat UI Interface
- `#8` Testing Suite
- `#10` CI Validation
- `#11` Vercel Deployment and Production Verification
- `#12` Implementation Tracker

## Local development

Install dependencies:

```powershell
npm ci
npm ci --prefix web
```

Run the Next.js app:

```powershell
npm --prefix web run dev
```

For stable local testing, the Playwright config launches the web app in `stub` mode automatically.
