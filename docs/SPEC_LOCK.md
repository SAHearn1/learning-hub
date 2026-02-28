# Architecture Specification Lock

**Version:** 1.0.0
**Date:** 2026-02-28
**Status:** LOCKED — changes require architecture review and sign-off

This document is the authoritative, immutable reference for RootWork Learning Hub's architecture invariants. Any proposed change that violates or relaxes a guarantee in this document requires explicit approval from the Platform Engineering lead, Security lead, and Compliance lead before implementation.

---

## 1. Tenancy Model

### 1.1 Invariants

| # | Invariant | Enforcement mechanism |
|---|-----------|----------------------|
| T-1 | Every row that contains student or educator data MUST include a `tenantId` column | Prisma schema — all 20+ tenant-scoped models carry `tenantId String` |
| T-2 | No API route MAY return data belonging to a different tenant | `withApiHandler` + `assertTenantAccess()` in `src/lib/security/tenant.ts` |
| T-3 | PLATFORM_ADMIN is the only role permitted to query across tenants | `src/lib/rbac.ts:canAccessTenant()` |
| T-4 | Tenant isolation MUST be validated by automated regression tests | `tests/integration/api/rls-auditing.test.ts`, `tests/integration/api/multi-tenant-rls-audit.test.ts` |

### 1.2 Isolation Strategy

**Primary layer:** Application-level enforcement in every route handler via `requireUser()` + `assertTenantAccess()`.
**Secondary layer:** `withApiHandler` wrapper propagates `tenantId` into structured error context for audit traceability.
**Tertiary (recommended):** PostgreSQL Row-Level Security — not yet deployed; tracked as a P1 hardening item. See `docs/RLS_AUDITING_REPORT.md`.

### 1.3 Permitted Exceptions

Curriculum content (`Standard`, `Topic`, `LearningObjective`, `Problem`) is shared globally and intentionally has no `tenantId`. These tables hold platform-curated educational content, not student or educator data.

---

## 2. Security Guarantees

### 2.1 Content Security Policy

**Canonical CSP definition:** `next.config.js` `headers()` function.
**Middleware layer:** `src/middleware.ts:applySecurityHeaders()` — applies `X-Content-Type-Options` and `X-Frame-Options` as defence-in-depth for streaming responses.

| Directive | Current value | Invariant |
|-----------|---------------|-----------|
| `default-src` | `'self'` | MUST NOT be widened |
| `script-src` | `'self' 'unsafe-inline' [clerk] [stripe] [cloudflare] [vercel]` | `unsafe-eval` MUST NOT be re-added; `unsafe-inline` to be replaced with nonce-based CSP when Stripe Elements v4 is adopted |
| `object-src` | `'none'` | MUST remain `'none'` |
| `base-uri` | `'self'` | MUST remain `'self'` |
| `form-action` | `'self'` | MUST remain `'self'` |

### 2.2 Transport Security

**HSTS configuration:** `next.config.js` only — `max-age=63072000; includeSubDomains; preload` (2 years).
**Invariant:** HSTS MUST NOT be set in `src/middleware.ts` — doing so would overwrite the 2-year preload with a shorter max-age on middleware-processed responses.

### 2.3 Authentication

- All non-public routes are protected by Clerk middleware (`src/middleware.ts`).
- Public routes whitelist is maintained in `isPublicRoute` matcher — additions MUST be reviewed for data exposure.
- Webhook routes (`/api/webhooks/`) are exempt from rate limiting and CSRF checks; they MUST enforce Svix or Stripe signature validation instead.

### 2.4 Rate Limiting

Two complementary layers:

| Layer | Scope | Store | Location |
|-------|-------|-------|----------|
| IP-per-path | Per IP address per pathname | In-memory (process-local) | `src/middleware.ts:enforceRateLimit()` |
| Tenant-per-user | Per authenticated user | In-memory (process-local) | `src/middleware.ts:enforceTenantRateLimit()` |
| Route-level | Per-route config | Redis-first + in-memory fallback | `src/lib/rate-limit.ts` via `withApiHandler` |

**Limitation:** In-memory stores reset on Vercel cold start. Redis-backed distributed limiting is active when `REDIS_URL` is set. Full production hardening requires Redis provisioning.

### 2.5 CSRF Protection

`enforceCsrfForApi()` validates the `Origin` header against `request.nextUrl.origin` for all mutating API methods (`POST`, `PUT`, `PATCH`, `DELETE`) except webhook routes. This MUST NOT be disabled without replacing with an equivalent CSRF mitigation.

---

## 3. RAG Contract

### 3.1 IEP Document Pipeline

| Property | Specification |
|----------|---------------|
| Namespace | `iep-documents` (Pinecone) — isolated from curriculum |
| Chunk ID format | `iep_{studentId}_{documentId}_{sectionType}_{chunkIndex}` |
| Idempotency | Delete-before-upsert — existing chunks for `(studentId, documentId)` are removed before re-indexing |
| Tenant filter | `studentId` metadata filter ALWAYS applied in query; cross-student access forbidden |
| Embedding model | `text-embedding-3-small` (1536 dimensions, OpenAI) |
| Audit | Every ingestion event written to `AuditLog` via `appendImmutableAuditLog()` |

### 3.2 Curriculum Pipeline

| Property | Specification |
|----------|---------------|
| Namespace | Default Pinecone namespace (curriculum is tenant-shared) |
| Chunk ID format | `finlit-{chapter}-{index:04d}` (financial literacy) OR `{sanitised-path}-chunk-{index}` |
| Idempotency | SHA-256 content hash stored in `IngestLog.contentHash`; re-ingestion skipped when matching SUCCESS log found |
| Tenant isolation | Not applicable — curriculum is globally shared read-only content |
| Embedding model | `text-embedding-3-small` (1536 dimensions, OpenAI) |

### 3.3 Context Window Allocation

| Budget slot | Allocation | Notes |
|-------------|-----------|-------|
| IEP context | 40% | Highest priority; accommodations injected first |
| Curriculum | 35% | Subject and grade filtered |
| Session history | 25% | Most recent turns |

### 3.4 RAG Invariants

- IEP chunks MUST include `studentId` in Pinecone metadata; queries MUST filter by `studentId`.
- Curriculum ingestion MUST be idempotent — identical payloads MUST skip re-embedding.
- Pinecone namespace for IEP MUST remain `iep-documents`; changing it requires re-indexing all student IEP data.
- Embedding model changes require a full re-index of affected namespaces before old embeddings are deleted.

---

## 4. Compliance Guarantees

### 4.1 Consent Gating

All student learning routes MUST enforce consent before processing:

```
/api/chat        /api/sessions      /api/explore/pretest
/api/assessments/* /api/irt/*       /api/srs/*
```

Enforcement via `hasRequiredMinorConsent()` in `src/lib/compliance/consent.ts`. Regression coverage in `tests/integration/api/consent-enforcement.test.ts`.

### 4.2 Data Retention

- Retention policy managed by `src/lib/compliance/data-retention.ts`
- Cron job: `/api/cron/data-retention` — runs daily at 02:00 UTC (configured in `vercel.json`)
- Retention periods follow COPPA (children < 13: minimal retention) and FERPA (education records: 7-year hold)

### 4.3 Audit Log

- All security-relevant actions MUST be written to `AuditLog` via `appendImmutableAuditLog()`
- Audit entries are append-only; deletions are not permitted
- Required fields: `tenantId`, `userId`, `action`, `resource`, `resourceId`, `ipAddress`

### 4.4 FERPA / COPPA / IDEA

- IEP data is subject to IDEA confidentiality; access MUST be restricted by role (see `src/app/api/iep/context/route.ts`)
- Parent consent is required for all minors; COPPA-covered users (age < 13) require explicit parental consent stored in `ConsentRecord`

---

## 5. Observability Guarantees

### 5.1 Metrics

| Metric | Required | Backend |
|--------|----------|---------|
| `api_requests_total` | Yes | Datadog StatsD (prod) / in-memory (dev) |
| `api_errors_total` | Yes | Datadog StatsD (prod) / in-memory (dev) |
| HTTP latency p95/p99 | Yes | Datadog StatsD (prod) / in-memory (dev) |
| AI token cost/hour | Yes | Datadog StatsD (prod) / in-memory (dev) |

### 5.2 SLO Targets (Aspirational — pending load-test baseline)

| Metric | Target |
|--------|--------|
| p95 API response time | < 500 ms |
| p99 API response time | < 1,000 ms |
| Chat p95 response time | < 2,000 ms |
| Error rate | < 1% |
| Availability | ≥ 99.5% |

### 5.3 Alert Thresholds

Defined in `src/lib/monitoring/alerts.ts`. Thresholds MUST be updated after load-test baseline is published.

---

## 6. Release Safety

See `docs/RELEASE_GATES.md` for full release gate specification.

**Invariants:**
- No release MAY be promoted to production without all CI gates passing
- No release MAY skip the smoke-test health check on the preview deployment
- The production DB migration MUST run via `prisma migrate deploy` before traffic is cut over

---

## 7. Change Control

To modify any guarantee in this document:
1. Open a GitHub issue tagged `architecture-review`
2. Obtain sign-off from Platform Engineering lead, Security lead, and Compliance lead
3. Update this document in the same PR as the code change
4. Update `CLAUDE.md` Phase completion tracker

**Last reviewed by:** Autonomous Platform Engineer
**Next review:** 2026-05-28 (quarterly)
