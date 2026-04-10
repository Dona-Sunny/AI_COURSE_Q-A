# AI Course Notes Q&A

AI Course Notes Q&A is a small Next.js study app that lets a student ask plain-English questions about one bundled AI course note set and get grounded answers with source excerpts.

Live app:
- `https://web-pink-two-52.vercel.app`

Public repository:
- `https://github.com/Dona-Sunny/AI_COURSE_Q-A`

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

## Data and storage

This project uses curated files rather than a database or vector store.

- Bronze-style raw input: [ai-course-notes.md](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\data\raw\ai-course-notes.md)
- Gold-style runtime artifact: [notes.json](c:\Users\donas\OneDrive%20-%20Durham%20College\AI\AIDI_2001\Assignment5\AI_Course_QA\data\notes.json)

For this assignment, that file-based storage is intentional. The goal is to prove the workflow clearly, not build infrastructure for scale.

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

## Submission-ready demo talking points

For the final video, you can show:
- the live Vercel URL
- the public GitHub repo
- the PRD and GitHub issues
- the architecture note
- the data flow from raw notes to curated JSON to grounded answer
- one supported question walkthrough
- one unsupported question walkthrough
- the Playwright tests and CI workflow
