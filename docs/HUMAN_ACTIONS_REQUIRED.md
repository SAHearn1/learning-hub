# Human Actions Required

These actions require a human with GitHub/Vercel/Clerk access. They are the remaining blockers for open operations issues.

## ~~P0 — Set `PRODUCTION_DATABASE_URL` and run production migration~~ DONE

Completed 2026-02-27. Secrets `PRODUCTION_DATABASE_URL` and `PRODUCTION_DIRECT_URL` configured in GitHub production environment. Migration workflow ran successfully (46s, green).

## ~~P0 — Configure Clerk live keys in Vercel production~~ DONE

Completed 2026-02-28. `pk_live_*` and `sk_live_*` keys set in Vercel production environment variables.

## ~~P0 — Provision Datadog and wire Vercel runtime metrics~~ REPLACED

Replaced by Vercel Analytics + Speed Insights (zero-config, free tier). Components added to root layout. Datadog StatsD code remains as an optional backend — set `DATADOG_STATSD_HOST` in Vercel env vars if/when a Datadog account is provisioned.

## ~~P0 — Add 11 Clerk secrets to GitHub Actions for E2E CI~~ DONE

Completed 2026-02-27. All 11 secrets configured in GitHub Actions repository secrets.

## P0 — Deploy RLS tenant isolation migration

After merging `feat/rls-tenant-isolation`, trigger the production migration:

1. GitHub → **Actions** → **Production DB Migrate** → **Run workflow** on `main`.
2. Reason: "Enable PostgreSQL RLS tenant isolation policies".
3. Confirm workflow succeeds.

RLS is currently in **passive mode** (policies defined but not forced on the table owner role). To fully activate defence-in-depth:

1. Integrate `withTenantRLS()` from `src/lib/rls.ts` into API route handlers.
2. Run companion migration to add `FORCE ROW LEVEL SECURITY` on all 16 tables.

Completion criteria:

- [ ] Production DB Migrate workflow green with RLS migration applied.
- [ ] (Future) API routes using `withTenantRLS()` + `FORCE ROW LEVEL SECURITY` enabled.

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

- [x] P0: Production database secret + migration workflow completed
- [x] P0: Clerk live keys configured in Vercel production (`pk_live_*` / `sk_live_*`)
- [x] P0: Metrics — Vercel Analytics + Speed Insights installed (Datadog optional)
- [x] P0: 11 Clerk GitHub Action secrets configured
- [ ] P0: RLS migration deployed to production
- [ ] P1: Staging load-test baseline run completed + SLO markdown published
- [ ] P2: Brand PNG assets sourced and aligned with manifest
