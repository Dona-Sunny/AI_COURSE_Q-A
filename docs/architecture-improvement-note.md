# Architecture Improvement Note

## Why this note exists

This project started as a greenfield proof of concept. After the first working slices were in place, the codebase was reorganized to make the supported behaviors easier to test, easier to reason about, and easier to extend without rewriting the whole app.

## Before

- Early progress was focused on getting one slice working at a time.
- The runtime concerns for note processing, retrieval, support routing, API handling, and UI behavior were still emerging.
- It would have been easy to let the Next.js route and page components accumulate business logic directly, which would have made end-to-end debugging and test coverage harder.

## Improvements made after the initial working version

- Deepened the server-side modules into clear boundaries:
  - `src/etl/index.js` owns normalization, chunking, and artifact generation.
  - `src/retrieval/index.js` owns deterministic scoring, ranking, and support classification.
  - `src/ask/index.js` owns deterministic support routing.
  - `src/api/ask.js` owns the request-to-response contract.
- Kept the Next.js API layer thin:
  - `web/src/app/api/ask/route.ts` only handles the Next.js request/response shell and delegates the application behavior to server modules.
- Extracted the main UI behavior into a dedicated component:
  - `web/src/app/chat-page.tsx` now holds the chat interaction flow.
  - `web/src/app/page.tsx` stays small and acts as the page entry point.
- Layered the tests around real boundaries instead of internal implementation details:
  - logic tests at the root
  - component tests in `web`
  - Playwright end-to-end tests at the repo root

## After

- Each major concept has a smaller public surface and a deeper implementation behind it.
- The tests now map cleanly to supported behaviors:
  - ETL reproducibility and chunk generation
  - retrieval and support classification
  - deterministic routing
  - `/api/ask` contract behavior
  - chat UI behavior
  - end-to-end browser flows
- The Next.js app is easier to evolve because UI and HTTP glue do not need to own the core business rules.
- The answer-generation layer now has an explicit provider seam, so deployment-specific changes
  such as `stub`, `openrouter`, or `openai` mode do not require changes to retrieval or routing.

## Why this structure is better for the project

- It matches the MVP architecture described in the PRD.
- It supports TDD at meaningful boundaries instead of forcing tests to reach into internals.
- It gives CI a clean set of commands to validate artifact sync, logic behavior, UI behavior, and browser behavior separately.
- It leaves a clear seam for the future real answer-generation service without rewriting retrieval or the API contract.
