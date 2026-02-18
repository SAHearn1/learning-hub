# ADR-0001: Select `learning-hub` as Primary Codebase and Define `RWFW-Tutoring-APP` Usage

- **Status:** Accepted
- **Date:** 2026-02-12
- **Owners:** Architecture (Implementer), Security (Verifier)
- **Related tasks:** A-01

## Context

We currently have multiple historical repositories and artifacts used across implementation, prototyping, and design exploration. This introduces risk in:

- Security control drift
- CI policy inconsistency
- Duplicate or conflicting documentation
- Slower release readiness due to split ownership

Production target for the current launch is **Vercel**, with `learning-hub` already containing the active app/runtime configuration and delivery surfaces.

## Decision

1. **`learning-hub` is the single primary production codebase** for build, test, release, and audit evidence.
2. **`RWFW-Tutoring-APP` is designated as legacy/reference-only** and must not be treated as a deployable source for production.
3. New implementation work for launch-critical functionality (P0/P1) must occur in `learning-hub` only.
4. Any reusable ideas from `RWFW-Tutoring-APP` must be imported via explicit, reviewed commits with provenance notes.

## Rationale for Single-Repo Approach

- Unifies security gates (lint/type/test/security/compliance) and branch protection.
- Simplifies evidence collection for COPPA/FERPA, ASVS, SSDF, and AI governance.
- Reduces configuration drift and operational confusion during incidents.
- Aligns ownership with clear CODEOWNERS and independent verifier model.

## Deployment Target

- **Primary hosting:** Vercel (preview + production environments)
- **Promotion path:** feature branch -> PR checks -> staging/preview validation -> production promotion
- **Rollback:** revert/redeploy from `learning-hub` only

## Trust Boundaries (System-Level)

1. **Client boundary (browser/app user context)**
2. **Application boundary (Next.js app/API on Vercel)**
3. **Data boundary (database + object storage)**
4. **Third-party boundary (AI provider, billing provider, auth provider, observability services)**
5. **Operations boundary (CI/CD runners, secret manager, release controls)**

## Architecture Sketch

```text
[Student/Teacher/Admin Browser]
             |
             v
   +---------------------------+
   |   learning-hub (Vercel)   |
   |  Next.js UI + API routes  |
   +---------------------------+
      |        |         |
      |        |         +--> [Observability/SIEM]
      |        +------------> [AI Provider APIs]
      +---------------------> [DB + Storage]
                \
                 \-----------> [Billing/Auth Providers]

RWFW-Tutoring-APP: legacy/reference only (non-production source)
```

## Consequences

### Positive
- Faster compliance and release readiness with one source of truth.
- Easier incident response and DR runbook alignment.
- Cleaner ownership and verifier workflows.

### Trade-offs
- Teams must migrate any remaining useful fragments from legacy repos.
- Requires disciplined backlog triage to avoid parallel implementation in legacy references.

## Compliance & Control Linkage

- Supports ASVS control mapping centralization (A-02, SEC-02).
- Supports SSDF traceability and provenance controls (SEC-03, C-04).
- Supports audit-evidence consistency across all P0/P1 tasks.

## Verification Evidence

- Verifier must confirm via PR review comment that:
  - deployment and CI policy references are `learning-hub` only;
  - legacy repo role is unambiguous;
  - trust boundaries are documented and used by threat model artifacts.

