# Human Actions Required

These actions require a human with GitHub/Vercel/Datadog/Clerk access. They are the remaining blockers for open operations issues.

## P0 — Set `PRODUCTION_DATABASE_URL` and run production migration

1. GitHub → **Settings** → **Environments** → `production` → **Secrets and variables**.
2. Add secret: `PRODUCTION_DATABASE_URL=postgresql://...`.
3. GitHub → **Actions** → **Production DB Migrate** (`.github/workflows/production-db-migrate.yml`) → **Run workflow** on `main`.
4. Confirm workflow succeeds and includes `npx prisma migrate deploy` completion.

Completion criteria:

- [ ] `PRODUCTION_DATABASE_URL` exists in production environment secrets.
- [ ] Latest **Production DB Migrate** workflow run is green.

## P0 — Configure Clerk live keys in Vercel production

1. Vercel → Project → **Settings** → **Environment Variables** → **Production**.
2. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...`.
3. Set `CLERK_SECRET_KEY=sk_live_...`.
4. Redeploy production to ensure runtime picks up updated auth keys.

Completion criteria:

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set to a `pk_live_...` value in Vercel production environment.
- [ ] `CLERK_SECRET_KEY` is set to a `sk_live_...` value in Vercel production environment.
- [ ] Production redeploy completed after key updates.

## P0 — Provision Datadog and wire Vercel runtime metrics

1. Provision/confirm Datadog Agent endpoint for StatsD ingress.
2. Vercel → Project → **Settings** → **Environment Variables**.
3. Add required variable:
   - `DATADOG_STATSD_HOST=<agent-or-datadog-host>`
4. Add optional tuning variables if needed:
   - `DATADOG_STATSD_PORT=8125`
   - `DATADOG_METRIC_PREFIX=learning_hub`
5. Redeploy production so runtime picks up new env vars.

Completion criteria:

- [ ] `DATADOG_STATSD_HOST` is present in Vercel production environment.
- [ ] Metrics are visible in Datadog for the deployed app.

## P0 — Add 11 Clerk secrets to GitHub Actions for E2E CI

GitHub → Repo **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Required secrets:

| Secret                             |
| ---------------------------------- |
| `CLERK_TESTING_TOKEN`              |
| `E2E_CLERK_USER_STUDENT_EMAIL`     |
| `E2E_CLERK_USER_STUDENT_PASSWORD`  |
| `E2E_CLERK_USER_EDUCATOR_EMAIL`    |
| `E2E_CLERK_USER_EDUCATOR_PASSWORD` |
| `E2E_CLERK_USER_PARENT_EMAIL`      |
| `E2E_CLERK_USER_PARENT_PASSWORD`   |
| `E2E_CLERK_USER_ADMIN_EMAIL`       |
| `E2E_CLERK_USER_ADMIN_PASSWORD`    |
| `CLERK_PUBLISHABLE_KEY_TEST`       |
| `CLERK_SECRET_KEY_TEST`            |

Then trigger `.github/workflows/e2e-tests.yml` and verify Phase 0 is green.

Completion criteria:

- [ ] All 11 required Clerk secrets are configured in GitHub Actions.
- [ ] Latest E2E CI run passes without missing-secret failures.

## P1 — Trigger staging load-test baseline and publish SLO markdown

1. GitHub → **Actions** → **Load Test + SLO Baseline** (`.github/workflows/load-test-baseline.yml`).
2. Run workflow against `staging` with the default scenario.
3. Confirm artifact `load-test-baseline` exists.
4. Confirm `docs/status/load-testing/slo-baseline-latest.md` is generated and attached to workflow summary/artifact output.

Completion criteria:

- [ ] Staging load-test baseline workflow run is green.
- [ ] SLO baseline markdown artifact is published.

## P2 — Source official brand PNGs from design team

1. Request approved PNG exports from design team as specified in `public/brand/ASSET_MANIFEST.md`.
2. Replace temporary/placeholder assets in `public/brand/` with approved files.
3. Verify filenames, dimensions, and transparent backgrounds match the manifest.

Completion criteria:

- [ ] All required brand PNGs have approved source files.
- [ ] `public/brand/` matches `public/brand/ASSET_MANIFEST.md` requirements.

## Roll-up Checklist

- [ ] P0: Production database secret + migration workflow completed
- [ ] P0: Clerk live keys configured in Vercel production + redeploy completed
- [ ] P0: Datadog provisioned + Vercel StatsD env configured
- [ ] P0: 11 Clerk GitHub Action secrets configured + E2E green
- [ ] P1: Staging load-test baseline run completed + SLO markdown published
- [ ] P2: Brand PNG assets sourced and aligned with manifest
