# Vercel Deployment And Production Verification

## Required production environment variables

Set one of these provider configurations in the Vercel project before deploying.

Recommended no-cost path:

- `ANSWER_GENERATION_MODE=openrouter`
- `OPENROUTER_API_KEY=<your free OpenRouter key>`
- `OPENROUTER_MODEL=openrouter/free`
- `OPENROUTER_SITE_URL=<your deployed site URL>`
- `OPENROUTER_APP_NAME=AI Course Notes Q&A`

Optional paid OpenAI path:

- `ANSWER_GENERATION_MODE=openai`
- `OPENAI_API_KEY=<your key>`
- `OPENAI_MODEL=gpt-4o-mini`

For local development or CI browser tests, use `ANSWER_GENERATION_MODE=stub` to keep answers deterministic.

## Vercel CLI flow

The current Vercel docs recommend this general CLI workflow:

1. Link the local project:
   - `vercel link`
2. Deploy a preview:
   - `vercel deploy`
3. Deploy production:
   - `vercel deploy --prod`

## Production verification checklist

After production deploys successfully:

1. Open the deployed URL.
2. Verify a supported question returns:
   - a grounded answer
   - a `strong` or `partial` support badge
   - source excerpts
3. Verify an unsupported question returns:
   - support level `none`
   - the deterministic refusal message
4. Verify there are no obvious runtime errors in Vercel logs.

## Browser verification against the deployed URL

The repo Playwright suite can target a deployed site instead of the local dev server.

PowerShell example:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://your-production-url.vercel.app"
npm run test:e2e
```

When `PLAYWRIGHT_BASE_URL` is set, the Playwright config skips the local web server and runs the browser checks against that deployed environment.

## Notes

- The browser suite remains deterministic in CI because the local test server is launched with `ANSWER_GENERATION_MODE=stub`.
- Production can use `ANSWER_GENERATION_MODE=openrouter` for a no-cost hosted provider path, or `ANSWER_GENERATION_MODE=openai` if you have an OpenAI API key with billing enabled.
