# Roadmap

This document tracks the development phases of the RootWork Learning Hub, from foundational security work through future capabilities.

## Completed Phases

### Phase 0 -- Security Foundations

Status: **Complete** (CI E2E pending)

- Clerk webhook sync with Svix signature verification and replay protection.
- Stripe webhook signature enforcement.
- Deployment pipeline with preview and production jobs.
- Admin critical endpoint tests (tenant invoicing, suspension).
- Chat route contract tests with streaming persistence validation.
- Full persistence flow tests (chat to database to progress views).

### Phase 1 -- Core Reliability

Status: **Complete**

- Standardized API handler (`withApiHandler`) adopted across all routes.
- Global and per-route rate limiting in middleware and handler wrapper.
- Build and lint gates passing.
- Parent consent data contract for minor filtering.
- Content safety guardrail false-positive fixes.
- 10 stale test files repaired; full suite at 836 passing tests.

### Phase 2 -- Learning Experience

Status: **Complete**

- Subject exploration, pretest, and topic recommendation flow.
- Streaming chat interface with topic preselection context.
- Student workspace cards mapped to end-to-end workflows (Learn, Community, Calm Corner, Settings).
- Explore-to-Learn handoff E2E test.
- Stream interruption and retry reliability tests.

### Phase 3 -- Educator, Parent, and Admin Maturity

Status: **Complete**

- Admin super dashboard and endpoints.
- Parent consent management (server/client split for SSR).
- Integration tests for all 9 educator and parent API routes (63 tests).
- Pagination and performance validation on reports and reviews.

### Phase 4 -- Compliance and Security Hardening

Status: **Complete**

- Consent API with role checks, transition validation, and audit logging.
- Data retention library and admin endpoint.
- Security headers and Content Security Policy.
- Universal consent gating on all student learning routes (sessions, pretests, assessments, IRT).
- Webhook replay-protection (timestamp skew + duplicate event ID).

## Current Phase

### Phase 5 -- Operations and Scale Readiness

Status: **In Progress**

- [x] Incident response playbook.
- [x] Load test scaffolding (steady-state, ramp, spike, soak profiles).
- [x] Monitoring and alerting modules.
- [ ] Execute and publish baseline load test results.
- [ ] Define and document SLO targets with measured baselines.

## Future Work

### LMS Thin Slice

- Course and class management UI for educators.
- Assignment creation, submission, and grading workflow.
- Gradebook views for educators and parents.
- Integration of 5R session outcomes into assignment grades.

### 5R Template Builder

- Educator-facing tool to create custom 5R lesson templates.
- Template library with sharing across a tenant.
- Phase-specific prompt customization without requiring code changes.

### Analytics Dashboards

- Tenant-level usage and engagement analytics.
- Educator-level classroom performance views.
- District-level compliance and adoption reporting.
- AI safety metrics (guardrail trigger rates, HITL review volumes).

### Mobile Responsive

- Responsive redesign for tablet and phone form factors.
- Offline-capable progressive web app for low-connectivity environments.

### District-Wide Deployment

- Onboarding automation for new tenants (provisioning, Clerk org, Stripe subscription).
- Bulk user import from SIS (Student Information System) feeds.
- SSO federation with district identity providers (SAML, OIDC).
- Data export and portability tooling for district compliance teams.
