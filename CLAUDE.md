# RootWork Learning Hub - Phase Task List

Last updated: 2026-02-16

## Source Notes
- This file was empty before this update.
- Tasks below are derived from:
  - `PRODUCTION_READINESS.md`
  - `PRODUCTION_READINESS_CHECKLIST.md`

## Phase 0 - Immediate Blockers (Release Gates)
- [ ] Verify Clerk webhook user sync end-to-end (`/api/webhooks/clerk`).
- [ ] Verify chat persistence path (`/api/chat` -> DB messages/sessions/progress).
- [ ] Enable authenticated E2E fixtures for Clerk and unskip critical E2E suites.
- [ ] Finalize deployment pipeline (`.github/workflows/deploy.yml` + Vercel env parity).
- [ ] Validate Stripe webhook signature enforcement and failed-event handling.
- [ ] Verify admin operations (tenant suspension, billing overrides, ingest logs).

Definition of done:
- All blocker flows have passing integration/E2E tests and written rollback steps.

## Phase 1 - Core Reliability
- [ ] Standardize API error contracts via `withApiHandler` adoption on legacy routes.
- [ ] Add/verify endpoint rate limiting for high-traffic and webhook routes.
- [ ] Close remaining type/build issues in CI and production build parity.
- [ ] Add health/ready checks and incident runbook starter docs.
- [ ] Confirm Redis fallback behavior and cache invalidation test coverage.

Definition of done:
- CI green on lint/typecheck/build/unit/integration and no known critical runtime regressions.

## Phase 2 - Learning Experience Completion
- [ ] Verify full `/explore` -> pretest -> topics -> `/learn` guided flow.
- [ ] Ensure 5Rs transitions are consistently persisted and recoverable on reload.
- [ ] Validate TRACE/thinking assessment writes and reporting integrity.
- [ ] Harden UX for failure states (stream interruptions, empty RAG, timeout/retry).
- [ ] Verify topic context threading from selected topic into session prompts.

Definition of done:
- Student journey passes E2E and produces consistent session, assessment, and progress data.

## Phase 3 - Educator, Parent, and Admin Maturity
- [ ] Expand educator reporting filters/export and class workflow coverage.
- [ ] Validate parent portal progress accuracy and settings persistence.
- [ ] Complete admin dashboard operational checks and access boundary tests.
- [ ] Add tenant-scoped audit traceability for sensitive operations.

Definition of done:
- Role-based journeys pass E2E with verified tenant isolation and audit trails.

## Phase 4 - Compliance and Security Hardening
- [ ] Enforce parental consent gating for under-13 users.
- [ ] Implement and verify retention/deletion workflows and audit evidence.
- [ ] Finalize security header strategy (including CSP) and input-validation audit.
- [ ] Verify all webhook signature checks (Clerk/Stripe/n8n) and alerting.
- [ ] Publish compliance/security operational docs (`COMPLIANCE.md`, `SECURITY.md` updates).

Definition of done:
- Compliance controls are test-backed, documented, and demonstrably enforceable.

## Phase 5 - Operations and Scale Readiness
- [ ] Run load tests for chat, assessments, and DB connection pool limits.
- [ ] Define and validate SLOs (latency, error rate, uptime).
- [ ] Configure monitoring alerts (Sentry/Datadog/uptime) with tested notifications.
- [ ] Implement backup/restore with documented RTO/RPO and restore drill evidence.
- [ ] Establish release checklist and on-call incident triage flow.

Definition of done:
- Production operations are observable, recoverable, and repeatable under load.

## Suggested Execution Order (Next 2 Sprints)
1. Phase 0 items 1-3 (identity, persistence, test confidence)
2. Phase 0 items 4-6 (deployment, billing integrity, admin controls)
3. Phase 1 and Phase 2 in parallel
4. Phase 3 after critical student flow reliability is stable
5. Phase 4 and Phase 5 before broad rollout
