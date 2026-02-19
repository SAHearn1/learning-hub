# Tests (learning-hub)

This repo uses:
- Unit/integration: Vitest
- E2E + a11y: Playwright (`tests/e2e/*`)

## Install

```powershell
cd C:\RWFW\apps\learning-hub
npm install
```

## Unit / Integration (Vitest)

```powershell
cd C:\RWFW\apps\learning-hub
npm run test:unit
```

Integration tests (explicit folder run):
```powershell
cd C:\RWFW\apps\learning-hub
npm run test:integration
```

## E2E / A11y (Playwright)

Playwright requires browser binaries. Do not forget:

```powershell
cd C:\RWFW\apps\learning-hub
npx playwright install
```

Run E2E:
```powershell
cd C:\RWFW\apps\learning-hub
npm run test:e2e
```

Run a11y-tagged specs:
```powershell
cd C:\RWFW\apps\learning-hub
npm run test:a11y
```

Detailed E2E structure and troubleshooting lives in `tests/e2e/README.md`.

## Local E2E Environment Variables

For local E2E, you typically need at least:
- `NEXT_PUBLIC_APP_URL` or `BASE_URL` (defaults to `http://localhost:3000`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (placeholder: `pk_test_your_key_here`)
- `CLERK_SECRET_KEY` (placeholder: `sk_test_your_key_here`)
- `DATABASE_URL` (recommended dedicated test DB; placeholder below)

Optional (use safe placeholders unless you are exercising those paths):
- `STRIPE_SECRET_KEY` (placeholder: `sk_test_placeholder`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (placeholder: `pk_test_placeholder`)
- `STRIPE_WEBHOOK_SECRET` (placeholder: `whsec_placeholder`)
- `ANTHROPIC_API_KEY` (placeholder: `sk-ant-placeholder`)

Example PowerShell session (safe placeholders):
```powershell
$env:NEXT_PUBLIC_APP_URL="http://localhost:3000"
$env:BASE_URL="http://localhost:3000"
$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_key_here"
$env:CLERK_SECRET_KEY="sk_test_your_key_here"
$env:DATABASE_URL="postgresql://user:password@localhost:5432/rootwork_test?schema=public"
$env:STRIPE_SECRET_KEY="sk_test_placeholder"
$env:NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_placeholder"
$env:STRIPE_WEBHOOK_SECRET="whsec_placeholder"
$env:ANTHROPIC_API_KEY="sk-ant-placeholder"
```

Note: E2E uses `playwright.config.ts` `webServer.command = "npm run dev"` and expects the dev server to bind `http://localhost:3000`.

