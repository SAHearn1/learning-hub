# Phases 5-8 Parallel Agent Execution Plan

This document defines how to complete Phases 5-8 using parallel agents with explicit ownership, dependencies, validation, and release gates.

## Scope

- Phase 5: Reliability, SRE foundations, integration hardening
- Phase 6: Performance and scalability optimization
- Phase 7: Complete role-based UX and accessibility hardening
- Phase 8: Production rollout, observability, and operational readiness

## Parallel Agent Model

All agents run in parallel on dedicated branches and submit evidence to the phase board.

| Agent | Track | Primary Scope |
|---|---|---|
| Agent A | SRE + Observability | SLO/SLI, alerting, dashboards, incident runbooks |
| Agent B | Platform Performance | API profiling, DB/index/query optimization, cache strategy |
| Agent C | E2E Quality | Role journeys, flaky test elimination, release test matrix |
| Agent D | Integrations | Clerk/Stripe/webhooks/job idempotency, replay safety |
| Agent E | UX Completion | Student/educator/parent/admin experience completion |
| Agent F | Accessibility + Mobile | WCAG 2.2 AA, keyboard/screen reader, responsive behavior |
| Agent G | Data + Curriculum Integrity | Topic graph completeness, course flow validation, migration safety |
| Agent H | Release + Ops | Canary rollout, rollback, runbooks, post-deploy validation |

## Operating Rules

1. Branching
- Each agent works on `phase5-8/<agent>-<topic>`.
- Rebase daily on `main`; no force push to `main`.

2. Ownership boundaries
- Single-owner rule per file area unless pair-approved in standup.
- Shared contracts live in `docs/status/phase5-8-contracts.md`.

3. Validation standard
- No PR merges without: tests + evidence + rollback note.
- Every PR includes a "risk level" and "blast radius" statement.

4. Cadence
- Twice-daily 15-minute dependency sync.
- End-of-day status posted to phase board.

## Phase 5: Reliability and Integration Hardening (Parallel)

### Objectives

- Eliminate integration brittleness in auth, billing, jobs, and webhooks.
- Establish production SLO baselines and incident response paths.

### Work packets by agent

- Agent A
  - Define SLIs/SLOs for API latency, error rate, session start success, webhook success.
  - Implement alert thresholds and runbooks.

- Agent D
  - Add idempotency keys for critical webhook/job paths.
  - Harden retry + replay handling; verify no duplicate state transitions.

- Agent H
  - Build canary + rollback playbook.
  - Add deployment smoke workflow.

- Agent C
  - Add role-path release smoke suite for student/educator/parent/admin.

### Validation gates

- `npm run lint`
- `npm run test:ci`
- `npm run build`
- Webhook replay and duplicate-event tests pass.
- Incident runbook dry-run completed and logged.

### Exit criteria

- SLO dashboard and alerts live.
- Webhook and job paths are idempotent and replay-safe.
- Release smoke suite green on staging and prod canary.

## Phase 6: Performance and Scalability (Parallel)

### Objectives

- Meet p95 latency targets and reduce expensive query paths.
- Improve throughput for high-volume endpoints and dashboards.

### Work packets by agent

- Agent B
  - Profile `/api/chat`, `/api/sessions`, `/api/explore/*`, `/api/progress`.
  - Remove N+1 patterns, add indexes, optimize payload shapes.
  - Add caching strategy (TTL + invalidation contracts).

- Agent G
  - Validate data model for performance regressions (migrations/indexes).
  - Add data-retention and archival job efficiency checks.

- Agent A
  - Instrument latency percentiles and capacity signals.

### Validation gates

- Performance regression suite with fixed baseline.
- p95 endpoint thresholds met in staging load test.
- No increase in error rate during load.

### Exit criteria

- Agreed p95 target met for top-traffic routes.
- Load test report stored in `docs/status/` with before/after metrics.

## Phase 7: UX Completion and Accessibility (Parallel)

### Objectives

- Deliver complete, predictable role-based journeys.
- Reach WCAG 2.2 AA coverage for core user flows.

### Work packets by agent

- Agent E
  - Student: onboarding -> topic -> pretest -> lesson -> checkpoint -> progress.
  - Educator: roster -> assignment -> intervention -> review loop.
  - Parent: consent -> student progress -> actionable guidance.
  - Admin: tenant health + operations actions with clear states.

- Agent F
  - Keyboard-only and screen reader audit.
  - Color contrast and focus visibility fixes.
  - Mobile/responsive fixes on all core flows.

- Agent C
  - Expand Playwright role journey tests and accessibility checks.
  - Stabilize test flake <2% over 5 repeated runs.

### Validation gates

- Playwright role suites green.
- Accessibility suite green (`tests/e2e/a11y/*`).
- Manual UX acceptance checklist signed off.

### Exit criteria

- No dead-end role paths.
- WCAG blocker issues at zero for core flows.
- Mobile usability pass for primary routes.

## Phase 8: Production Rollout and Operability Completion (Parallel)

### Objectives

- Controlled rollout with safe rollback.
- Complete operational readiness and handoff.

### Work packets by agent

- Agent H
  - Execute staged rollout: internal -> pilot tenants -> 25% -> 50% -> 100%.
  - Validate kill switches and rollback speed.

- Agent A
  - Verify alert quality (signal/noise), on-call routing, incident templates.

- Agent D
  - Production integration verification for Clerk/Stripe/webhooks/jobs.

- Agent C
  - Post-deploy regression suite and production synthetic checks.

### Validation gates

- Rollout checkpoints pass with no Sev-1/Sev-2 incidents.
- Error budget remains within threshold.
- All release evidence captured in tracker.

### Exit criteria

- Global go-live complete.
- On-call playbook and recovery drills completed.
- Phase 8 sign-off approved by engineering + product.

## Dependency Graph (Critical)

1. Agent D idempotency contracts must land before Agent H rollout to 50%+
2. Agent B performance fixes must land before final Phase 8 global rollout
3. Agent F accessibility fixes must land before Phase 7 sign-off
4. Agent A SLO alerts must be live before any canary starts

## Risk Register (Top)

- Risk: Role guard regressions under strict enforcement
  - Mitigation: feature flags + tenant cohort rollout + denied-access dashboards

- Risk: Webhook duplicate processing under retries
  - Mitigation: idempotency tables + replay tests + alerting

- Risk: E2E flake hiding regressions
  - Mitigation: quarantine policy + repeated-run gate + deterministic fixtures

- Risk: Performance drift after merge
  - Mitigation: CI perf budgets + nightly load smoke + SLO alerts

## Done Definition (Per Agent)

1. Code merged with tests
2. Evidence linked on board
3. Rollback note documented
4. Runbook updated (if operational behavior changed)

## Program-Level Completion Definition

1. `npm run verify:prod` is green on release candidate
2. Role-based E2E + a11y suites are green
3. SLO dashboards and paging are active
4. Rollout completed to 100% with no unresolved Sev-1/Sev-2 issues
5. Release notes + handoff docs published
