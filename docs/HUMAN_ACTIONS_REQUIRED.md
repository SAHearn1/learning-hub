# Human Actions Required

These items require manual action by Dr. Hearn or infrastructure admin and cannot be automated by code.

Last updated: 2026-02-27

---

## Open Blockers — Roll-up Tracker

| Priority | Issue | Title | Status |
|----------|-------|-------|--------|
| P0 | #174 | Run prisma migrate deploy in production | ⏳ Pending |
| P0 | #189 | Provision Datadog + set `DATADOG_STATSD_HOST` in Vercel | ⏳ Pending |
| P0 | #192 | Add 11 Clerk E2E secrets to GitHub Actions | ⏳ Pending |
| P1 | #176 | Trigger load-test baseline against staging | ⏳ Pending |
| P2 | #179 | Source brand PNG assets from design team | ⏳ Pending |
| — | #178 | `gh issue close 178` (Stripe webhook — work is done) | ⏳ Pending CLI auth |

---

## P0 — Pre-Launch Blockers

### Issue #174 — Production Database Migration

**Why:** LMS models (Course, Class, Assignment, Submission, Grade, FiveRTemplate, etc.) exist in schema and local migrations but have never been applied to the production database. All `/api/lms/*` routes will throw Prisma P1001/P2021 errors in production until this runs.

**Steps:**

1. In GitHub repository → **Settings → Secrets and variables → Actions → Environments**
2. Select (or create) the `production` environment
3. Add secret: `PRODUCTION_DATABASE_URL` = your production PostgreSQL connection string
4. Go to **Actions → `Production DB Migration` workflow**
5. Click **Run workflow** → select `main` branch → confirm

**Completion criteria:**
- [ ] Workflow run completes with green checkmark
- [ ] `GET /api/lms/courses` returns 200 (not Prisma error) in a production smoke test
- [ ] Migration entry visible in `_prisma_migrations` table on prod DB

---

### Issue #189 — Datadog Metrics Backend

**Why:** `src/lib/monitoring/metrics.ts` now pushes to Datadog StatsD, but without `DATADOG_STATSD_HOST` set, the client silently no-ops. Alert thresholds (error rate > 5%, P95 > 1s, concurrent users > 90) will not fire in production.

**Required Vercel env vars** (Settings → Environment Variables → Production):

| Variable | Value |
|----------|-------|
| `DATADOG_STATSD_HOST` | Your Datadog StatsD agent hostname or IP (**required**) |
| `DATADOG_STATSD_PORT` | `8125` (optional, default) |
| `DATADOG_METRIC_PREFIX` | `learning_hub.` (optional, default) |

**Steps:**

1. In Datadog: provision a StatsD agent (DogStatsD) reachable from Vercel (e.g. via a VPC or public endpoint)
2. In Vercel project → **Settings → Environment Variables**
3. Add `DATADOG_STATSD_HOST` for **Production** environment
4. Redeploy the production deployment to pick up the new var

**Completion criteria:**
- [ ] `DATADOG_STATSD_HOST` set in Vercel production env
- [ ] Metrics appear in Datadog dashboard within 5 minutes of a production request
- [ ] At least one alert rule fires correctly against aggregated cross-instance data

---

### Issue #192 — Clerk E2E Test Credentials in CI

**Why:** `.github/workflows/e2e-tests.yml` and `tests/helpers/auth.ts` are complete, but the 11 required secrets are not provisioned. Without them every E2E run fails at sign-in and auth regressions go undetected.

**Steps:**

1. In GitHub repository → **Settings → Secrets and variables → Actions**
2. Add each secret from the table below:

| Secret name | What to set |
|-------------|-------------|
| `CLERK_PUBLISHABLE_KEY_TEST` | Clerk test-mode publishable key (`pk_test_…`) |
| `CLERK_SECRET_KEY_TEST` | Clerk test-mode secret key (`sk_test_…`) |
| `CLERK_TESTING_TOKEN` | Clerk testing token that bypasses CAPTCHA/bot-detection |
| `E2E_CLERK_USER_STUDENT_EMAIL` | Email for the test student Clerk account |
| `E2E_CLERK_USER_STUDENT_PASSWORD` | Password for the test student Clerk account |
| `E2E_CLERK_USER_EDUCATOR_EMAIL` | Email for the test educator Clerk account |
| `E2E_CLERK_USER_EDUCATOR_PASSWORD` | Password for the test educator Clerk account |
| `E2E_CLERK_USER_PARENT_EMAIL` | Email for the test parent Clerk account |
| `E2E_CLERK_USER_PARENT_PASSWORD` | Password for the test parent Clerk account |
| `E2E_CLERK_USER_ADMIN_EMAIL` | Email for the test admin Clerk account |
| `E2E_CLERK_USER_ADMIN_PASSWORD` | Password for the test admin Clerk account |

3. After adding secrets, go to **Actions → `E2E Tests` workflow** → **Run workflow** on `main`

**Completion criteria:**
- [ ] All 11 secrets present in Actions settings
- [ ] `E2E Tests` workflow completes green on `main`
- [ ] All 20 Playwright spec files execute and are reported (no skipped auth fixtures)
- [ ] Phase 0 "Full E2E auth fixture run in CI" box in `CLAUDE.md` can be checked

---

## P1 — Sprint 1 Post-Launch

### Issue #176 — Load Test Baseline + SLO Documentation

**Why:** `tests/load/` k6 scripts and `.github/workflows/load-test-baseline.yml` are complete. No results have been published, so SLO targets and alert thresholds remain uncalibrated.

**Steps:**

1. Ensure staging environment is running (`STAGING_URL` env var set)
2. Go to **Actions → `Load Test Baseline` workflow** → **Run workflow**
3. Set `target_url` input to your staging base URL (e.g. `https://learning-hub-staging.vercel.app`)
4. Workflow automatically publishes results to `docs/status/load-testing/slo-baseline-latest.md`
5. Review the p50/p95/p99 numbers and update alert thresholds in `src/lib/monitoring/alerts.ts` if needed

**Completion criteria:**
- [ ] Workflow run completes against staging
- [ ] `docs/status/load-testing/slo-baseline-latest.md` contains p50/p95/p99 per key route
- [ ] Error rate baseline documented
- [ ] Formal SLO targets (e.g. p95 < 500ms, error rate < 1%) added to `docs/`
- [ ] Alert thresholds in `alerts.ts` updated to reflect measured baselines
- [ ] Issue #176 closed

---

## P2 — Sprint 2

### Issue #179 — Brand PNG Assets

**Why:** `BrandLogo`, `FiveRIcon`, and `FiveRStrip` components reference image paths under `/public/brand/` that contain no PNG files. Components render broken images in production.

**Steps:**

1. Review the asset manifest: `public/brand/ASSET_MANIFEST.md`
2. Source the following from the design team:
   - RWFW seal / logo (PNG, minimum 512×512px)
   - 5 phase icons — one per R: Regulate, Restore, Reflect, Reason, Reconnect (PNG, minimum 128×128px each)
3. Place files at the paths specified in `ASSET_MANIFEST.md`
4. Commit and push to trigger a redeploy

**Completion criteria:**
- [ ] All 6 PNG files committed to `public/brand/`
- [ ] `BrandLogo` renders in production without broken image
- [ ] `FiveRIcon` renders all 5 phase icons
- [ ] `FiveRStrip` renders correctly
- [ ] Issue #179 closed

---

## Remaining One-Off Admin Tasks

### Close GitHub Issue #178

Stripe webhook documentation is complete (`docs/ops/ISSUES_174_176_178_179_192.md`). The issue just needs to be closed once `gh` CLI is authenticated:

```bash
gh issue close 178 --comment "Runbook complete. Stripe webhook registered and verified."
```

### Credential Rotation (if secrets were exposed)

If any credentials were previously committed to git history, rotate them:
- [ ] Clerk API keys (publishable + secret)
- [ ] Anthropic API key
- [ ] Stripe API keys
- [ ] Database connection string
- [ ] Webhook signing secrets

### Custom Domain

Configure custom domain in Vercel:
- Primary: `learn.rootworkframework.com` (or preferred subdomain)
- Update `NEXT_PUBLIC_APP_URL` env var accordingly

### Favicon + Open Graph Images

- Resize seal PNG to 32×32px for `favicon.ico`
- Create 180×180px version for Apple touch icon
- Create 1200×630px Open Graph image at `/public/og-image.png`
