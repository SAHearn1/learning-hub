# Release Gates

**Version:** 1.0.0
**Last updated:** 2026-02-28
**Owner:** Verifier Agent
**Reference:** `docs/SPEC_LOCK.md`

---

## Overview

Every commit merged to `main` and every production deploy **MUST** satisfy all
blocking gates below. The Verifier Agent checks gates automatically on every PR.
A single failing blocking gate prevents merge and deploy.

Non-blocking gates produce warnings but do not prevent merge.

---

## Gate 1 — Code Quality (BLOCKING)

| Check | Command | Pass condition |
|---|---|---|
| TypeScript compilation | `npm run build` | Exit code 0; zero type errors |
| ESLint | `npm run lint` | Exit code 0; zero errors (warnings allowed) |
| Prettier | `npx prettier --check .` | No format violations in changed files |

**CI job:** `ci.yml → quality` job

---

## Gate 2 — Unit & Integration Tests (BLOCKING)

| Check | Command | Pass condition |
|---|---|---|
| Full test suite | `npx vitest run` | 1119/1119 tests pass (all test files) |
| No skipped tests | `npx vitest run --reporter verbose` | Zero `it.skip` in changed files |
| Coverage minimum | `npx vitest run --coverage` | ≥ 80% line coverage on changed files |

**Known issue:** Intermittent tinypool OOM crash in constrained CI environments.
If a single worker crashes, re-run the failing test file in isolation before
treating as a gate failure.

**CI job:** `ci.yml → test` job

---

## Gate 3 — Tenant Isolation Regression (BLOCKING)

| Check | File | Pass condition |
|---|---|---|
| Cross-tenant RBAC | `tests/integration/api/rbac-gating.test.ts` | 42/42 tests pass |
| Consent enforcement | `tests/integration/api/consent-enforcement.test.ts` | All tests pass |
| RLS audit | `docs/RLS_AUDITING_REPORT.md` — referenced tests | No regressions |

Any PR that touches Prisma queries, RLS policies, or API route auth logic **MUST**
re-run the full RBAC and consent test suites explicitly.

**CI job:** `ci.yml → test` job (included in full suite)

---

## Gate 4 — Security Invariants (BLOCKING)

Automated checks that run on every PR:

| Invariant | How checked |
|---|---|
| No `unsafe-eval` in CSP | `scripts/check-csp.sh` or grep in CI |
| No secrets in git | `gitleaks` scan (`ci.yml → gitleaks` job) |
| Dependency audit | `npm audit --audit-level=high` |
| No new in-memory-only rate limiters | Code review + grep for `new Map` in middleware |
| Webhook signature enforcement present | Unit tests in `__tests__/route.test.ts` for clerk + stripe |

**CSP check script** (inline CI step):
```bash
grep -r "unsafe-eval" next.config.js && echo "FAIL: unsafe-eval found in CSP" && exit 1 || echo "PASS: no unsafe-eval"
```

---

## Gate 5 — Database Schema Integrity (BLOCKING)

| Check | Command | Pass condition |
|---|---|---|
| Prisma client in sync | `npx prisma generate && git diff --quiet` | No schema drift |
| Migration history consistent | `npx prisma migrate status` | All migrations applied |
| Seed/schema sync | `node scripts/validate-seed-schema-sync.mjs` | Exit code 0 |

Schema changes require a migration file committed alongside the schema change.
Running `prisma migrate deploy` in production is gated behind the
`Production DB Migration` GitHub Actions workflow.

---

## Gate 6 — Preview Deploy Smoke Test (BLOCKING for production)

After every merge to `main`, the Vercel preview deploy is smoke-tested before
traffic is shifted to production.

**Script:** `scripts/smoke-test.ts`

```bash
# Run smoke tests against a preview URL
SMOKE_TEST_URL=https://<preview>.vercel.app npx ts-node scripts/smoke-test.ts
```

| Endpoint | Expected | Notes |
|---|---|---|
| `GET /api/health` | `200 { status: "ok" }` | Liveness |
| `GET /api/health` → DB field | `db: "ok"` | DB connectivity |
| `GET /` | `200` HTML | Public homepage renders |
| `GET /sign-in` | `200` HTML | Auth page renders |
| `GET /api/webhooks/clerk` | `405` (GET not allowed) | Webhook reachable |

The smoke test must complete within 30 seconds. A timeout is treated as failure.

---

## Gate 7 — RAG Health (NON-BLOCKING — warning only)

| Check | Command | Pass condition |
|---|---|---|
| Pinecone index reachable | `scripts/check-rag-health.ts` | Index responds within 5s |
| Embedding model version pinned | Verify `RAG_EMBEDDING_MODEL` env var set | Not empty |
| Latest ingest timestamp | Query `IngestLog` table | Ingest run within 7 days |

RAG failures produce a warning comment on the PR but do not block merge.
A P0 incident is opened if RAG health fails for more than 24 hours.

---

## Gate 8 — Required Secrets Validation (BLOCKING for production)

Before any production deploy, the following environment variables **MUST** be
present in Vercel → Production environment:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon/Postgres connection string |
| `REDIS_URL` | Upstash Redis URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key (must be `pk_live_`) |
| `CLERK_SECRET_KEY` | Clerk backend key (must be `sk_live_`) |
| `CLERK_WEBHOOK_SECRET` | Svix signing secret |
| `STRIPE_SECRET_KEY` | Stripe backend key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `ANTHROPIC_API_KEY` | Claude API key |
| `PINECONE_API_KEY` | Pinecone vector DB |
| `PINECONE_INDEX_NAME` | Pinecone index name |
| `SENTRY_DSN` | Error monitoring |

The `env-preflight.ts` module validates these at startup. Build fails if any
required variable is missing.

---

## Gate 9 — E2E Tests (NON-BLOCKING — CI target)

| Check | File | Status |
|---|---|---|
| Student learning flow | `tests/e2e/student/` | Requires Clerk test credentials in CI |
| Educator dashboard | `tests/e2e/educator/` | Requires Clerk test credentials in CI |
| Parent view | `tests/e2e/parent/` | Requires Clerk test credentials in CI |

E2E tests are currently non-blocking due to missing Clerk CI secrets. Once
`E2E_CLERK_USER_*` secrets are provisioned (see `docs/HUMAN_ACTIONS_REQUIRED.md`),
this gate becomes blocking.

---

## PR Checklist (for authors)

Before opening a PR, verify:

- [ ] `npm run lint` passes locally
- [ ] `npm run build` passes locally
- [ ] `npx vitest run` passes locally (or failing tests are explained)
- [ ] New API routes use `withApiHandler`
- [ ] New Prisma queries include `tenantId` scoping
- [ ] No hardcoded secrets or IDs
- [ ] CSP not weakened (`unsafe-eval` not added)
- [ ] Security headers not duplicated between `next.config.js` and `middleware.ts`
- [ ] RBAC enforcement present on new routes
- [ ] `docs/SPEC_LOCK.md` invariants satisfied

---

## Release Runbook

1. PR passes all blocking gates → merge to `main`
2. Vercel auto-deploys preview → smoke test runs automatically
3. If smoke test passes → Vercel promotes to production
4. If `prisma/schema.prisma` changed → trigger `Production DB Migration` workflow
5. Post-deploy: verify `/api/health` returns `{ status: "ok", db: "ok" }`
6. Post-deploy: check Sentry for new errors in first 15 minutes
7. Post-deploy: check Datadog (or CloudWatch) for latency regression

---

## Changelog

| Date | Version | Change |
|---|---|---|
| 2026-02-28 | 1.0.0 | Initial creation |
