# Release Gates

**Version:** 1.0.0
**Date:** 2026-02-28

This document defines the mandatory release gates that MUST pass before any code is promoted from feature branch → staging → production. CI enforces automated gates; manual gates require explicit human sign-off.

---

## Gate Definitions

### Gate 0 — Pre-Merge (CI, automated)

Every PR must pass all of the following before merge to `main`:

| Check | Tool | Failure action |
|-------|------|---------------|
| Secret scanning | gitleaks (`.github/workflows/ci.yml`) | Block merge, revoke exposed secret |
| Lint | `next lint` | Block merge |
| Type check | `tsc --noEmit` | Block merge |
| Unit tests | `vitest run` (≥1119 passing) | Block merge |
| Integration tests | `vitest run tests/integration` (≥101 files) | Block merge |
| Build | `next build` | Block merge |
| Prisma schema validation | `prisma migrate diff --exit-code` | Block merge |
| Dependency audit | `npm audit --audit-level=critical` | Block merge on critical CVE |
| Compliance check | `npm run compliance:check` | Block merge |

**Acceptance:** All checks green in GitHub Actions CI before PR is eligible for merge.

---

### Gate 1 — Preview Deployment (automated)

Triggered automatically on PR creation / push:

| Check | Mechanism | Failure action |
|-------|-----------|---------------|
| Vercel preview build | Vercel integration | Block preview; investigate build logs |
| Health check smoke test | `GET /api/health` — 5 retries × 5s | Fail deployment; rollback Vercel preview |

**Acceptance:** Preview URL is healthy (`/api/health` returns 200). Preview URL posted to PR comment.

---

### Gate 2 — Staging Validation (manual)

Before production promotion, a human operator MUST verify on staging:

| Verification | Steps |
|-------------|-------|
| Auth flows | Sign in as student, educator, parent, admin — verify role-based routing |
| Chat / learn flow | Initiate a learning session — verify streaming response |
| Consent gating | Test as unconsented minor — verify 403 returned |
| Billing | Initiate a checkout flow — verify Stripe redirect (test mode) |
| Admin dashboard | Log in as PLATFORM_ADMIN — verify tenant list and usage metrics |
| Data retention | Call `POST /api/cron/data-retention` with cron secret — verify no errors |

**Acceptance:** All flows verified by operator. Staging sign-off recorded in the release PR description.

---

### Gate 3 — Production DB Migration (manual, conditional)

**Required when:** Prisma schema changes are included in the release.

| Step | Command | Owner |
|------|---------|-------|
| Trigger migration workflow | GitHub Actions → `Production DB Migration` → Run workflow | Engineering lead |
| Verify migration log | Confirm `prisma migrate deploy` exit code 0 | Engineering lead |
| Smoke test after migration | `GET /api/health` returns 200 | Engineering lead |

**Rollback:** Restore database from most recent backup (see `docs/DISASTER_RECOVERY.md`). Re-deploy previous Vercel production deployment.

---

### Gate 4 — Production Deployment (automated + manual)

| Step | Mechanism | Owner |
|------|-----------|-------|
| Merge to `main` | GitHub Actions CI Gate 0 must pass | PR author |
| Production deploy | `deploy.yml` — `vercel --prod` | CI (automated) |
| Health check smoke test | `GET /api/health` — 6 retries × 10s | CI (automated) |
| Manual go/no-go | Engineering lead reviews deployment summary | Engineering lead |

**Rollback procedure:**
```bash
# Via Vercel dashboard: Deployments → select previous green deployment → Redeploy
# Or via CLI:
vercel rollback --yes
```

If rollback is triggered, open an incident in `#incidents` Slack channel and follow `docs/incident-response-playbook.md`.

---

### Gate 5 — Post-Deployment Validation (manual, 30 min window)

Within 30 minutes of production deployment:

| Check | Owner |
|-------|-------|
| Monitor error rate in Datadog/Sentry (< 1%) | On-call engineer |
| Monitor p95 response time (< 500 ms) | On-call engineer |
| Verify `/api/metrics` returns expected shape | On-call engineer |
| Spot-check one student learning session | On-call engineer |
| Confirm no PagerDuty alerts fired | On-call engineer |

**Failure criteria:** If error rate exceeds 5% or p95 > 2s sustained for > 5 minutes, trigger rollback immediately.

---

## Environment Secrets Required

Before any production deployment, confirm the following secrets are set in Vercel Production environment:

| Secret | Purpose | Status |
|--------|---------|--------|
| `DATABASE_URL` | Primary DB connection | Required |
| `DIRECT_URL` | Direct DB connection (migrations) | Required |
| `CLERK_SECRET_KEY` | Clerk auth (MUST be `sk_live_*`) | Required |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (MUST be `pk_live_*`) | Required |
| `STRIPE_SECRET_KEY` | Stripe billing | Required |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature | Required |
| `ANTHROPIC_API_KEY` | AI chat | Required |
| `PINECONE_API_KEY` | Vector store | Required |
| `REDIS_URL` | Rate limiting + caching | Required |
| `N8N_WEBHOOK_SECRET` | Curriculum ingest | Required |
| `DATADOG_STATSD_HOST` | Metrics aggregation | Strongly recommended |
| `NEXT_PUBLIC_SENTRY_DSN` | Error reporting | Recommended |
| `CRON_SECRET` | Data retention cron auth | Required |

See `docs/HUMAN_ACTIONS_REQUIRED.md` for provisioning instructions.

---

## Rollback Decision Tree

```
Production incident detected
        │
        ▼
Is it a security breach?
    YES → Follow docs/incident-response-playbook.md immediately
    NO  → Continue
        │
        ▼
Is it caused by a code deployment?
    YES → vercel rollback --yes → monitor for 10 min
    NO  → Continue
        │
        ▼
Is it a DB migration issue?
    YES → Restore DB from backup → redeploy previous version
    NO  → Continue
        │
        ▼
Is it an external dependency (Clerk, Stripe, Pinecone)?
    YES → Check vendor status page → enable maintenance mode if needed
    NO  → Escalate to engineering lead
```

---

## Gate Bypass Policy

**No gate may be bypassed in production.** In development/staging, Gate 1 (preview smoke test) may be skipped with explicit written justification in the PR. All other gates are non-negotiable.

Emergency hotfixes follow the same gate sequence but with an expedited human review timeline (30 minutes instead of normal SLA).
