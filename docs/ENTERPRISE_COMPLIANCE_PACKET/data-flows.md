# Data Flows

**Version:** 1.0.0
**Last updated:** 2026-02-28
**Owner:** Operations Agent

---

## Overview

This document describes all data flows involving student PII in the Learning Hub
platform. It satisfies FERPA § 99.31(a)(1)(i)(B) requirements for school officials
to maintain direct control over disclosed education records.

---

## 1. Student Authentication Flow

```
Student browser
    │  (1) Sign-in form
    ▼
Clerk-hosted sign-in page (clerk.rwfw-learninghub.com)
    │  (2) Credential validation
    ▼
Clerk Identity Provider
    │  (3) JWT session token issued
    ▼
Student browser (session stored in Clerk cookie)
    │  (4) API request with Clerk session cookie
    ▼
Vercel Edge (src/middleware.ts)
    │  (5) Clerk token validated via @clerk/nextjs/server
    │  (6) Rate limits checked
    ▼
Next.js API Route
    │  (7) getCurrentUser() → Prisma → Neon PostgreSQL
    ▼
Response returned to browser
```

**Data transmitted externally:** Email + name transmitted to Clerk at account creation.
Session tokens are Clerk JWTs — no session state stored externally except in Clerk.

---

## 2. Student Chat (AI Tutoring) Flow

```
Student browser
    │  (1) Chat message submitted
    ▼
POST /api/chat (Vercel serverless function)
    │  (2) Auth: Clerk token verified
    │  (3) Consent check: ParentConsent table (Neon)
    │  (4) Usage limit check: AIUsageLedger (Neon)
    │  (5) Pre-generation guardrails:
    │       - Content safety check (no PII in prompt)
    │       - IEP safety check
    │       - 5R compliance check
    │  (6) RAG retrieval: Pinecone namespace = tenant:<tenantId>
    │       (curriculum chunks only — no student data)
    │  (7) Prompt assembly: system prompt + curriculum context + chat history
    │       (student name NOT included; session ID used as identifier)
    ▼
Anthropic Claude API (claude-sonnet-4-x)
    │  (8) Response generated
    ▼
POST /api/chat (streaming response)
    │  (9) Post-generation guardrails:
    │       - Hallucination detection
    │       - Post-generation content safety
    │  (10) Persistence: Message → Neon PostgreSQL
    │  (11) Usage ledger updated: AIUsageLedger (Neon)
    │  (12) Audit log written (Neon)
    ▼
Student browser (SSE stream)
```

**PII transmitted to Anthropic:** None. The pre-generation guardrail strips PII.
Student names, IDs, and email addresses are never included in Claude prompts.

---

## 3. Parental Consent Flow

```
Parent browser
    │  (1) Parent signs in (Clerk)
    │  (2) Navigate to consent management page
    ▼
GET /api/parent/children (Neon — parent's children list)
    │
    │  (3) Parent grants or revokes consent
    ▼
POST /api/compliance/consent
    │  (4) Consent state written: ParentConsent table (Neon)
    │  (5) Audit log written: AuditLog table (Neon)
    │  (6) Cache invalidated: Redis session cache
    ▼
Immediate effect: student's learning routes return 403 until consent re-granted
```

**Consent data stored:** Consent state (granted/denied/revoked), timestamp, parent
user ID, child user ID, IP address of consent action, tenant ID. All in Neon.

---

## 4. Progress and Assessment Flow

```
Student completes assessment
    │  (1) POST /api/assessments/[type]/submit
    ▼
Vercel API Route
    │  (2) Auth + consent check
    │  (3) Assessment result stored: Assessment* tables (Neon)
    │  (4) IRT ability estimate updated: IRTResponse table (Neon)
    │  (5) Progress views updated: Progress* tables (Neon)
    │  (6) Audit log written
    ▼
Educator dashboard
    │  (7) GET /api/educator/reports → Neon (tenant-scoped)
    ▼
Parent dashboard
    │  (8) GET /api/parent/progress/[studentId] → Neon (child-scoped)
```

**Data classification:** Assessment responses are FERPA education records.
Access requires educator/parent role within the same tenant.

---

## 5. Webhook Flows

### Clerk → Learning Hub

```
Clerk webhook delivery (Svix)
    │  (1) POST /api/webhooks/clerk
    │  (2) Svix signature validated (timestamp skew < 5 min)
    │  (3) Event processed: user.created → User record created (Neon)
    │  (4) Event processed: user.updated → User record updated (Neon)
    │  (5) Audit log written
```

### Stripe → Learning Hub

```
Stripe webhook delivery
    │  (1) POST /api/stripe/webhook
    │  (2) Stripe signature validated
    │  (3) Subscription event processed → Tenant billing updated (Neon)
    │  (4) Audit log written
```

---

## 6. Data Retention and Deletion Flow

```
Retention trigger (Vercel Cron — nightly at 02:00 UTC)
    │  POST /api/cron/data-retention
    ▼
src/lib/compliance/data-retention.ts
    │  (1) Query expired records per retention policy:
    │       - Student PII: 7 years post-enrolment
    │       - Session transcripts: 7 years
    │       - Audit logs: 7 years (immutable; archived not deleted)
    │       - Consent records: 7 years from consent action
    │  (2) Soft-delete or anonymise expired records (Neon)
    │  (3) Delete expired vectors from Pinecone (tenant namespace)
    │  (4) Write retention execution log: IngestLog / AuditLog (Neon)
    ▼
Admin dashboard: /api/admin/data-retention (GET for log review)
```

---

## 7. External API Data Access Summary

| External service | Student PII shared | Minimisation applied |
|---|---|---|
| Anthropic (Claude) | None | PII stripped by guardrails |
| OpenAI (Embeddings) | None | Curriculum text only |
| Clerk | Email, name | Required for authentication |
| Stripe | District billing contact | No student data |
| Pinecone | None | Curriculum vectors only |
| Vercel | IP in edge logs | Auto-purged after 7 days |
| Neon | All application data | TLS + encryption at rest |
| Upstash Redis | Session IDs (cache keys) | Max TTL 3600s; no persistent PII |
| Sentry | Scrubbed error context | PII scrubbing enabled |
| N8N | Curriculum documents | No student data |

---

## 8. Data Residency Summary

All student data is stored in the United States:

| Data store | Location |
|---|---|
| Neon PostgreSQL | AWS us-east-1 |
| Pinecone | AWS us-east-1 |
| Upstash Redis | AWS us-east-1 |
| Vercel Edge logs | Global CDN; PII-minimal |
| Clerk | US data centre |

EU/EEA deployments require additional configuration. Contact legal@rwfw.org.

---

## Changelog

| Date | Change |
|---|---|
| 2026-02-28 | Initial creation |
