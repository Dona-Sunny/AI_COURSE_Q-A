## Problem Statement

Students in an Artificial Intelligence course need a quick way to ask plain-English questions about course concepts and get trustworthy answers grounded in the actual course notes. Traditional note review is slow, and general-purpose AI tools may return answers that are not aligned with the course material or that go beyond what was taught. The product must help students study faster while staying anchored to a single preloaded set of AI course notes.

## Solution

Build a small web app called "AI Course Notes Q&A" that lets a student ask a course-related question and receive a short, student-friendly answer based only on preprocessed AI course notes. The app will retrieve the most relevant note chunks using deterministic keyword-based retrieval, classify support as `none`, `partial`, or `strong`, and use that classification as a deterministic routing rule for whether the OpenAI-backed answer generator is invoked or bypassed. The app will display both the answer and the supporting source excerpts. If the available notes do not provide enough support, the API will return a deterministic refusal response instead of guessing. The app will be built with Next.js, deployed on Vercel, use a tracked JSON artifact as its note store, validate ETL reproducibility in GitHub Actions, and include unit, API, and Playwright tests.

## User Stories

1. As an AI course student, I want to ask a question in plain English, so that I can study without manually searching through all of the notes.
2. As an AI course student, I want the app to answer only from the bundled course notes, so that I can trust the response is aligned with what was taught.
3. As an AI course student, I want answers to be concise and student-friendly, so that I can learn quickly without reading dense generated text.
4. As an AI course student, I want to see the source excerpts used for each answer, so that I can verify the response and continue studying from the original notes.
5. As an AI course student, I want the app to refuse unsupported questions, so that I am not misled by hallucinated content.
6. As an AI course student, I want broad questions to be answered only within the limits of the available notes, so that I understand when an explanation is partial.
7. As an AI course student, I want a simple chat-like interface, so that asking questions feels natural and low-friction.
8. As an AI course student, I want each question to be processed independently, so that previous questions do not distort the current answer.
9. As an AI course student, I want a clear loading state while my question is being processed, so that I know the app is working.
10. As an AI course student, I want a clear insufficient-context message when the notes do not support my question, so that I know the limitation comes from the source material.
11. As an AI course student, I want the app to remain focused on one AI course in the MVP, so that the experience is simple and reliable.
12. As an instructor or project reviewer, I want the app to demonstrate grounded retrieval and answer generation, so that the product shows a clear educational AI workflow.
13. As a developer, I want the notes to be preprocessed into a stable JSON format, so that retrieval is deterministic and easy to test.
14. As a developer, I want ETL to run locally, so that I can regenerate processed notes during development.
15. As a developer, I want GitHub Actions to validate ETL reproducibility, so that committed processed data stays in sync with raw notes.
16. As a developer, I want the note-loading logic isolated behind a server-only module, so that runtime access to note data is simple and cacheable.
17. As a developer, I want retrieval logic to be deterministic and independent of the LLM provider, so that it can be unit tested thoroughly.
18. As a developer, I want answer generation behind a small service interface, so that I can stub it in tests and swap model configuration through environment variables.
19. As a developer, I want startup configuration validation for required environment variables, so that deployment issues fail fast and are easier to diagnose.
20. As a developer, I want API contract tests for the ask endpoint, so that request handling, support classification, and response shape remain stable.
21. As a developer, I want Playwright coverage for both supported and unsupported question flows, so that the deployed user experience is verified end to end.
22. As a future maintainer, I want the data schema to include document metadata per chunk, so that multiple bundled documents can be added later without redesigning the system.
23. As a future maintainer, I want retrieval implemented through a modular interface, so that embeddings or other ranking strategies can be added later without rewriting the full app.
24. As a future maintainer, I want processed chunk records to store normalized helper fields, so that search remains fast, reproducible, and consistent between build-time and runtime.

## Implementation Decisions

- The MVP targets a single AI course and a student study workflow, but the note schema should leave room for multiple preloaded documents later.
- The product will use only preloaded bundled course notes for v1. There is no user upload flow in the MVP.
- Raw note inputs for the MVP are limited to plain text, markdown, or JSON. PDF parsing is explicitly excluded from v1.
- Processed notes will be stored in a single tracked JSON artifact containing chunk-level records.
- Each chunk record will include document metadata plus the original text for display and normalized helper fields for retrieval. The normalized helper fields for MVP are `normalizedText` and `tokens`.
- Text normalization for indexing and querying will lowercase text, strip punctuation, collapse whitespace, and remove a fixed stopword list, while preserving original text for UI display.
- ETL will extract and normalize text from raw bundled notes, split content by paragraph boundaries first, then create size-limited chunks with slight overlap.
- ETL must be runnable both locally and in GitHub Actions. GitHub Actions will validate reproducibility rather than committing regenerated data.
- CI will rebuild processed notes from raw inputs and fail if the regenerated artifact differs from the committed version.
- Retrieval in the MVP will use deterministic keyword-based scoring with stopword removal rather than embeddings.
- The retrieval scorer will use simple overlap-based relevance scoring.
- Retrieval will select the top 3 chunks by relevance score, with a simple context size cap to keep the prompt focused and stable.
- Support level will be assigned in the retrieval layer as `none`, `partial`, or `strong`.
- `strong` support requires at least 2 meaningful query terms matched across at least 2 different chunks. Otherwise support falls back to `partial` or `none`.
- Retrieval output must deterministically control orchestration behavior rather than relying on prompt-only safeguards.
- For `none` support, the `/api/ask` flow must not call the LLM at all and must return a deterministic refusal response stating that the course notes do not contain enough relevant information. The response may optionally include top-matching chunks labeled as reference-only sources.
- For `partial` support, the `/api/ask` flow must call `generateAnswer(context, question)` with the retrieved chunks, and the response must explicitly include a limitation statement that the answer is based only on available course notes and may be incomplete.
- For `strong` support, the `/api/ask` flow must call `generateAnswer(context, question)` with the retrieved chunks and return a fully grounded answer plus sources.
- Broad questions may receive a partial answer only when supported context exists, and the limitation must be explicit in the returned response.
- The application runtime will be centered on a server-side `/api/ask` endpoint in Next.js.
- The client will act as a thin chat-like interface that submits individual questions and renders responses.
- Backend processing is fully stateless. Each request is handled independently with no conversational memory in retrieval or prompting.
- The `/api/ask` response contract will include the submitted question, the computed support level, the answer or deterministic refusal content, and a list of source excerpts with metadata.
- The `/api/ask` contract must make it possible for clients and tests to distinguish `none`, `partial`, and `strong` outcomes without inferring them from prose alone.
- Source displays in the UI will use short excerpts plus metadata rather than full chunk text.
- Retrieval and note loading will run on the server only.
- Runtime note access will be encapsulated in a server-only notes repository/loader that reads from the filesystem and caches parsed data.
- In production, the notes loader cache will live for the process lifetime. In development, notes refresh on server restart.
- Answer generation will be isolated behind a dedicated `generateAnswer(context, question)` service interface.
- The LLM prompt will prioritize strict groundedness over general helpfulness, but the primary guardrail is deterministic API routing from retrieval support level to invocation or bypass behavior.
- The OpenAI model will be configurable through environment variables rather than hardcoded to one model name.
- Missing or malformed processed notes at runtime will produce a hard server error with clear logs and a polite user-facing message that notes are unavailable.
- Missing required environment variables such as the OpenAI API key or model name will be detected by startup or first server initialization validation so configuration errors fail early.
- The UI for MVP is a single-page chat-like layout with a question input, submit action, answer region, sources list, loading state, and clear error or insufficient-context messaging.
- The app will be deployed to Vercel as part of the MVP definition of done.

### Proposed Deep Modules

- Notes ETL module: transforms raw bundled notes into a deterministic processed chunk artifact.
- Notes repository module: loads, validates, caches, and exposes processed notes to the runtime.
- Retrieval module: normalizes queries, scores chunks, ranks results, and classifies support level.
- Answer generation module: accepts supported context plus a question and returns a grounded response through the OpenAI provider.
- Ask application module: orchestrates notes loading, retrieval, deterministic support-level routing, conditional answer generation, and response shaping for the API layer.
- UI module: provides the chat-like student interface and renders answer, sources, and status states.

### System Contract

- Retrieval returns top-ranked chunks plus a support classification of `none`, `partial`, or `strong`.
- The ask orchestration layer must use support classification as a hard routing contract:
- `none`: bypass `generateAnswer`, return deterministic refusal content, and optionally include reference-only sources.
- `partial`: call `generateAnswer` with retrieved context and return an answer that explicitly includes a limitation statement.
- `strong`: call `generateAnswer` with retrieved context and return a normal grounded answer.
- This routing rule must be deterministic, testable, and independent of model behavior.
- The UI and tests must rely on the API contract and support level rather than guessing behavior from prompt wording alone.

## Testing Decisions

- Tests should focus on external behavior and stable contracts rather than implementation details.
- Unit tests will cover normalization behavior, paragraph-based chunking, notes loading and validation, keyword retrieval scoring and ranking, support-level classification, and deterministic routing behavior for `none`, `partial`, and `strong`.
- Unit tests for orchestration must verify that `generateAnswer` is not called for `none`, is called with limitation-producing behavior for `partial`, and is called normally for `strong`.
- API route handler tests are part of the MVP definition of done and must verify the full request-to-response contract, including support level in the response, deterministic refusal behavior for `none`, limited-answer behavior for `partial`, successful grounded-answer behavior for `strong`, and error behavior.
- Playwright tests are required for the MVP and must cover two flows: a happy-path grounded answer flow and an insufficient-context refusal flow.
- If a partial-support user flow is not covered in Playwright for MVP, it must still be covered at unit and API levels.
- Playwright and CI should use a test mode that stubs answer generation while keeping real retrieval intact, so end-to-end tests are reliable and do not depend on live OpenAI calls.
- Manual or optional verification may still use the real OpenAI provider outside CI.
- Because the repository is currently greenfield, there is no in-repo prior art yet; the test suite should establish clean patterns around pure service tests, API contract tests, and browser-level behavior tests.

## Out of Scope

- User file uploads
- Authentication or user accounts
- Databases or external persistent storage
- Embeddings or vector search
- Multi-course management interfaces
- Chat memory or multi-turn conversational context
- PDF parsing
- Admin tools or content management panels
- Large datasets or generalized document-chat behavior beyond the bundled course notes
- Any answer generation that goes beyond the retrieved and supported course-note context

## Further Notes

- The MVP definition of done is: a deployed Vercel-hosted Next.js app that answers grounded questions from one preloaded AI course note set, shows supporting source excerpts, safely refuses unsupported questions, passes unit and API tests, and passes two Playwright tests in CI.
- The architecture should stay intentionally simple and deterministic in v1 to make the system explainable, testable, and appropriate for a course project.
- The next workflow step after this PRD is to break the work into small implementation issues and then execute those slices with TDD.
