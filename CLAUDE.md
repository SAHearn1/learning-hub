# RootWork Learning Hub - Phase Completion Tracker

Last updated: 2026-02-16

## Phase 0 - Immediate Blockers

Status: In progress

- [x] Verify Clerk webhook sync endpoint exists and enforces Svix signature.
  Evidence: `src/app/api/webhooks/clerk/route.ts`
- [x] Add automated tests for Clerk webhook guardrails and processing.
  Evidence: `src/app/api/webhooks/clerk/__tests__/route.test.ts`
- [x] Verify Stripe webhook signature enforcement.
  Evidence: `src/app/api/stripe/webhook/route.ts`, `src/app/api/stripe/webhook/__tests__/route.test.ts`
- [x] Verify deployment pipeline + preview/prod jobs exist.
  Evidence: `.github/workflows/deploy.yml`
- [x] Verify admin critical endpoints with tests.
  Evidence: `src/app/api/admin/super/tenants/[tenantId]/invoice/__tests__/route.test.ts`, `src/app/api/admin/super/tenants/[tenantId]/suspension/__tests__/route.test.ts`
- [x] API-level chat route contract tests updated to current implementation.
  Evidence: `tests/integration/api/chat.test.ts`
- [x] Streaming chat persistence side effects (assistant message + usage ledger + audit log) validated in integration tests.
  Evidence: `tests/integration/api/chat.test.ts`
- [ ] End-to-end validation of full persistence flow (`/api/chat` -> DB -> progress views).
- [ ] Full E2E auth fixture run in CI with Clerk test credentials.

Latest validation run:
- `npm run lint` passed
- `npm run build` passed
- `npx vitest run src/app/api/webhooks/clerk/__tests__/route.test.ts src/app/api/stripe/webhook/__tests__/route.test.ts src/app/api/admin/super/tenants/[tenantId]/invoice/__tests__/route.test.ts src/app/api/admin/super/tenants/[tenantId]/suspension/__tests__/route.test.ts` passed

## Phase 1 - Core Reliability

Status: In progress

- [x] Standardized API handler adopted broadly.
  Evidence: `src/lib/api-handler.ts`, multiple `src/app/api/**/route.ts`
- [x] API-level rate limiting exists in middleware.
  Evidence: `middleware.ts`, `src/middleware.ts`
- [x] Build and lint gates green locally.
  Evidence: `npm run lint`, `npm run build`
- [x] Fix parent consent data contract for minor filtering.
  Evidence: `src/app/api/parent/students/route.ts`
- [ ] Migrate remaining high-risk routes to `withApiHandler` (`/api/chat`, `/api/assessments/[id]/submit`, webhook routes if desired).
- [x] Migrate `/api/assessments/[id]/submit` to `withApiHandler` with standardized auth/error handling.
  Evidence: `src/app/api/assessments/[id]/submit/route.ts`
  Tests: `tests/integration/api/assessment-submit.test.ts`
- [x] Resolve stale integration tests for current `/api/chat` contract.
  Evidence: `tests/integration/api/chat.test.ts`
- [ ] Migrate remaining highest-risk legacy routes (`/api/chat`, webhooks) to `withApiHandler` where streaming semantics allow.

## Phase 2 - Learning Experience Completion

Status: In progress

- [x] Subject exploration + pretest + topic recommendation flow implemented.
  Evidence: `src/app/explore/*`, `src/app/api/explore/*`
- [x] Learn page supports topic preselection context.
  Evidence: `src/app/learn/page.tsx`, `src/app/api/chat/route.ts`
- [x] Streaming chat interface wired.
  Evidence: `src/hooks/useChat.ts`, `src/app/api/chat/route.ts`
- [ ] Add end-to-end regression test covering `/explore` -> `/learn?topic=...` -> first chat turn.
- [ ] Add reliability tests for stream interruption/retry behavior.

## Phase 3 - Educator, Parent, Admin Maturity

Status: In progress

- [x] Admin super endpoints and dashboard surfaces exist.
  Evidence: `src/app/admin/dashboard/page.tsx`, `src/components/admin/super-admin-dashboard.tsx`
- [x] Parent consent management page now safely split server/client for prerender compatibility.
  Evidence: `src/app/parent/consent/page.tsx`, `src/app/parent/consent/parental-consent-client.tsx`
- [ ] Expand integration/E2E coverage for educator and parent workflows.
- [ ] Validate export/report performance and pagination under larger tenant datasets.

## Phase 4 - Compliance and Security Hardening

Status: In progress

- [x] Consent API with role checks + transition validation + audit logging.
  Evidence: `src/app/api/compliance/consent/route.ts`
- [x] Data retention library and admin endpoint exist.
  Evidence: `src/lib/compliance/data-retention.ts`, `src/app/api/admin/data-retention/route.ts`
- [x] Security headers and CSP configured.
  Evidence: `next.config.js`, `middleware.ts`
- [x] Enforce consent gating on core session and pretest learning routes.
  Evidence: `src/app/api/sessions/route.ts`, `src/app/api/explore/pretest/route.ts`, `src/app/api/explore/pretest/next/route.ts`
  Tests: `tests/integration/api/consent-enforcement.test.ts`
- [ ] Enforce consent gating universally on all remaining student learning routes.
- [ ] Add explicit webhook replay-protection tests (timestamp skew/idempotency guard).
- [x] Add explicit webhook replay-protection checks and tests (timestamp skew + duplicate event id).
  Evidence: `src/app/api/webhooks/clerk/route.ts`
  Tests: `src/app/api/webhooks/clerk/__tests__/route.test.ts`

## Phase 5 - Operations and Scale Readiness

Status: In progress

- [x] Incident response playbook present.
  Evidence: `docs/incident-response-playbook.md`
- [x] Load test scaffolding exists.
  Evidence: `tests/load/*`
- [x] Monitoring/alerts modules exist.
  Evidence: `src/lib/monitoring/*`, `src/lib/monitoring.ts`
- [ ] Execute and publish baseline load test results.
- [ ] Define and document SLO targets with measured baseline numbers.

## Immediate Next Actions

1. Add one E2E happy-path test for explore-to-learn handoff with topic preselection.
  Evidence: `tests/e2e/student/student-explore-handoff.spec.ts`
  Note: local Playwright execution timed out in this environment; run in CI or a dev machine with full browser/auth setup.
2. Add consent-enforcement checks on remaining student learning endpoints beyond sessions/pretests/assessment submit.
3. Execute CI-equivalent integration suite (`npm run test:integration`) and resolve any remaining stale tests.
