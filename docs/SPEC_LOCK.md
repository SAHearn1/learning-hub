# SPEC_LOCK — System Invariants and Architectural Decisions

**Version:** 1.0.0
**Last updated:** 2026-02-28
**Owner:** Architect Agent
**Status:** ACTIVE — all PRs must be verified against this document

---

## Purpose

`SPEC_LOCK.md` is the authoritative record of non-negotiable system invariants for
the Learning Hub platform. Any PR that violates an invariant listed here **MUST be
blocked** by the Verifier Agent before merge.

Changes to this document require explicit human approval and must be reflected in
`docs/RELEASE_GATES.md`.

---

## 1. Tenancy Invariants

### 1.1 Data Isolation (CRITICAL — P0)

Every database query that touches student, session, assessment, or curriculum data
**MUST** be scoped to a single tenant.

| Enforcement mechanism | Status |
|---|---|
| Prisma `where: { tenantId }` clause | REQUIRED on all multi-tenant models |
| PostgreSQL Row Level Security (RLS) | Enabled on `User`, `Session`, `Message`, `Assessment*`, `Progress*` tables |
| Cross-tenant regression test | `tests/integration/api/rbac-gating.test.ts` (42 tests) |
| CI gate | Build fails on missing `tenantId` in Prisma query to scoped models |

**Prohibited patterns:**
- `prisma.session.findMany()` without `where: { tenantId }`
- Raw SQL without `tenant_id = $1` predicate on scoped tables
- Shared global caches keyed only by record ID (must include tenantId in key)

### 1.2 RBAC Rules

Roles: `STUDENT`, `PARENT`, `EDUCATOR`, `DISTRICT_ADMIN`, `PLATFORM_ADMIN`

| Route family | Minimum role | Notes |
|---|---|---|
| `/api/student/*` | `STUDENT` | Plus parental consent check for minors |
| `/api/parent/*` | `PARENT` | Child must belong to parent's tenant |
| `/api/educator/*` | `EDUCATOR` | Class must belong to educator's tenant |
| `/api/lms/*` | `EDUCATOR` (write), `STUDENT` (read own) | See LMS RBAC matrix |
| `/api/admin/*` | `DISTRICT_ADMIN` | Super-admin routes require `PLATFORM_ADMIN` |
| `/api/admin/super/*` | `PLATFORM_ADMIN` | Strictly enforced; 403 for all other roles |
| `/api/webhooks/*` | Signature-only | No session auth; Svix/Stripe signature required |

Role escalation is **prohibited**: a `STUDENT` token must never return educator data.

### 1.3 Parental Consent Gating

All student learning routes **MUST** gate on active parental consent for minors.
Routes subject to consent enforcement:

- `/api/chat`
- `/api/sessions`
- `/api/explore/pretest*`
- `/api/assessments/*`
- `/api/irt/*`
- `/api/srs/*`

Evidence: `tests/integration/api/consent-enforcement.test.ts`

---

## 2. Distributed Rate Limiting

### 2.1 Architecture

The platform uses a **two-tier rate limiting** strategy:

| Tier | Location | Backend | Purpose |
|---|---|---|---|
| Edge IP limiter | `src/middleware.ts` | In-memory per-instance Map | Coarse per-IP throttle at Edge before auth; acceptable because Edge instances are ephemeral and IP limiting at this tier is a best-effort guard |
| API handler limiter | `src/lib/rate-limit.ts` | Redis-first, in-memory fallback | Precise per-user / per-tenant rate limiting; persists across cold starts when `REDIS_URL` is set |
| Distributed rate limiter | `src/lib/redis/rate-limiter.ts` | Redis ZSET sliding window | High-value endpoints (chat, assessments) |

### 2.2 Invariants

- All authenticated API endpoints **MUST** pass through the `withApiHandler` wrapper which
  invokes the Redis-backed rate limiter (`src/lib/rate-limit.ts`).
- `REDIS_URL` **MUST** be provisioned in all environments except local dev.
- The in-memory fallback in `rate-limit.ts` is only used when Redis is unavailable
  and **MUST NOT** be treated as the primary limiter in production.
- The Edge middleware in-memory store (`rateLimitStore`, `tenantRateLimitStore`) is a
  best-effort coarse guard only; it does NOT replace the Redis-backed API limiter.

### 2.3 Rate Limit Headers

All 429 responses **MUST** include:
- `Retry-After: <seconds>`
- `X-RateLimit-Scope: ip | user | tenant`

---

## 3. Content Security Policy (CSP)

### 3.1 Authoritative Source

Security headers are defined **exclusively** in `next.config.js → headers()`.
No other file may set `Content-Security-Policy`, `X-Frame-Options`, `HSTS`, or
`X-Content-Type-Options` headers. Duplication causes unpredictable override order.

### 3.2 Invariants

| Directive | Required state |
|---|---|
| `unsafe-eval` | **PROHIBITED** in `script-src` |
| `object-src` | Must be `'none'` |
| `base-uri` | Must be `'self'` |
| `form-action` | Must be `'self'` |
| `frame-ancestors` | Implied by `X-Frame-Options: DENY`; redundant but acceptable |

`unsafe-inline` in `script-src` is a **temporary technical debt** required by the
current Next.js App Router version. The migration path is nonce-based CSP; tracked
in the backlog.

### 3.3 Allowed Origins

| Directive | Allowed origins |
|---|---|
| `script-src` | `clerk.rwfw-learninghub.com`, `js.stripe.com`, `challenges.cloudflare.com`, `vercel.live` |
| `connect-src` | Above + `api.stripe.com`, `*.pinecone.io`, `api.anthropic.com`, `api.openai.com` |
| `frame-src` | `js.stripe.com`, `accounts.rwfw-learninghub.com`, `challenges.cloudflare.com`, `vercel.live` |

Adding a new origin requires updating both `next.config.js` **and** this document.

---

## 4. AI / RAG Boundaries

### 4.1 Prompt Injection Prevention

All user-supplied content passed to the LLM **MUST** be sanitised by the
pre-generation content-safety guardrail (`src/lib/ai/guardrails/content-safety.ts`)
before inclusion in a prompt.

### 4.2 Post-Generation Checks

All LLM output **MUST** pass post-generation guardrail checks before being streamed
to the client:
- Hallucination detection (`src/lib/ai/guardrails/hallucination-detector.ts`)
- Post-generation content safety

Violations trigger HITL flagging in `AiSuggestionReview`.

### 4.3 RAG Boundaries

- RAG retrieval is scoped per tenant — no cross-tenant vector lookup.
- Pinecone namespace **MUST** be `tenant:<tenantId>` or `shared:curriculum`.
- Embedding model version must be pinned and recorded in `docs/RAG_OPERATIONS.md`.
- Chunk IDs must be deterministic (see RAG_OPERATIONS.md § 2).

### 4.4 AI Cost Controls

- Per-tenant token usage tracked in `AIUsageLedger`.
- Hard limit enforced before each AI call via `src/lib/usage-limits.ts`.
- Daily cost anomaly alerts defined in `src/lib/monitoring/alerts.ts`.

---

## 5. Compliance Guarantees

### 5.1 Data Retention

- Student PII retention: maximum 7 years post-enrolment (FERPA).
- Data retention cron: `/api/cron/data-retention` (Vercel cron).
- Every retention run **MUST** produce a structured log entry (retention_run_id,
  records_processed, records_deleted, errors).

### 5.2 Audit Trail

- All privileged actions (role changes, consent updates, admin operations) **MUST**
  write to the `AuditLog` table via `src/lib/audit.ts`.
- Audit logs are immutable (no UPDATE/DELETE allowed via application code).

### 5.3 Consent

- Parental consent state is the ground truth in the `ParentConsent` table.
- Consent checks are performed server-side; client-side UI state is cosmetic only.

### 5.4 Webhook Security

- Clerk webhooks: Svix signature + timestamp skew validation (< 5 minutes).
- Stripe webhooks: Stripe signature header validation.
- No webhook endpoint may skip signature verification.

---

## 6. Deployment Constraints (Vercel)

| Constraint | Requirement |
|---|---|
| Edge runtime | Middleware must use only Edge-compatible APIs (no ioredis, no fs) |
| Cold start | Rate limiter and session cache must use Redis (not in-memory) in production |
| Environment variables | All secrets must be provisioned via Vercel env vars; no `.env` committed |
| Preview deploys | Must pass smoke tests before production promotion |
| Database migrations | `prisma migrate deploy` runs via GitHub Actions `Production DB Migration` workflow; never ad-hoc |

---

## 7. Release Gate Summary

Full release gate definition: `docs/RELEASE_GATES.md`

| Gate | Blocking |
|---|---|
| `npm run lint` passes | YES |
| `npm run build` passes | YES |
| All Vitest tests pass (1119/1119) | YES |
| Tenant isolation regression tests pass | YES |
| CSP does not contain `unsafe-eval` | YES |
| No new in-memory-only rate limiters | YES |
| Smoke test passes on preview URL | YES |
| No secrets committed to git | YES |

---

## Changelog

| Date | Version | Change | Author |
|---|---|---|---|
| 2026-02-28 | 1.0.0 | Initial creation — captures invariants from Phases 0–6 | Architect Agent |
