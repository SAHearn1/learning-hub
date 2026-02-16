# Architecture

This document describes the system architecture of the RootWork Learning Hub, an AI-powered tutoring platform built with Next.js 15 (App Router), Prisma ORM, Clerk Auth, and Anthropic Claude.

## High-Level Request Flow

```
Client (Browser)
  |
  v
Next.js Middleware (src/middleware.ts)
  - Clerk auth session validation
  - Global API rate limiting (sliding window, per-IP)
  - Security headers (CSP, HSTS, X-Frame-Options)
  |
  v
API Route Handler (src/app/api/**/route.ts)
  - withApiHandler() wrapper (src/lib/api-handler.ts)
    - Request ID generation / forwarding
    - Per-route rate limiting
    - Structured logging with duration
    - Automatic error-to-JSON mapping (AppError hierarchy)
    - Observability hooks (captureError, trackEvent)
  - requireUser() / requireRole() auth checks (src/lib/auth.ts)
  |
  v
Service Layer (src/lib/**)
  - Business logic, validation (Zod schemas)
  - Consent gating for student learning routes
  - AI pipeline orchestration
  |
  v
Prisma ORM --> PostgreSQL
  - All queries scoped by tenantId
  - Immutable audit log with SHA-256 hash chain
```

## Directory Structure

```
src/
  app/
    api/                  # Next.js App Router API routes
      admin/              # Platform and school admin endpoints
      assessments/        # Diagnostic, formative, summative assessments
      billing/            # Stripe billing integration
      chat/               # AI tutoring chat (streaming SSE)
      compliance/         # Consent management
      educator/           # Educator dashboards, reviews, reports
      explore/            # Subject exploration and pretests
      iep/                # IEP accommodation management
      irt/                # Item Response Theory adaptive engine
      lms/                # Course, class, assignment, grading
      parent/             # Parent dashboards and consent
      progress/           # Student progress views
      regulate/           # Calm Corner check-in
      sessions/           # Learning session lifecycle
      student/            # Student settings and profiles
      webhooks/           # Clerk and Stripe webhook receivers
    learn/                # Student learning workspace (5R sessions)
    explore/              # Subject exploration UI
    admin/                # Admin dashboard pages
    parent/               # Parent consent and progress pages
    regulate/             # Calm Corner UI
    settings/             # User settings pages
  lib/
    ai/
      client.ts           # Anthropic Claude API client
      guardrails/         # Pre- and post-generation safety checks
        content-safety.ts # Harmful content, PII, escalation detection
        hallucination-detector.ts
        five-rs-compliance.ts
        iep-safety.ts
        index.ts          # GuardrailsEngine orchestrator
      hitl/               # Human-in-the-Loop review service
        suggestion-service.ts
      prompts/            # System prompt templates
    five-rs/
      state-machine.ts    # 5R phase transition logic
      phase-transition.ts # Phase advancement rules
    compliance/
      data-retention.ts   # COPPA-compliant retention enforcement
    api-handler.ts        # withApiHandler() wrapper
    api-errors.ts         # Typed error hierarchy (AppError)
    audit.ts              # Immutable audit log (SHA-256 chain)
    auth.ts               # Clerk-backed auth helpers
    db.ts                 # Prisma client singleton
    rate-limit.ts         # Sliding-window rate limiter
    rbac.ts               # Role-based access control
    usage-limits.ts       # Per-tenant AI usage metering
    monitoring.ts         # Error capture and metrics
  components/             # React UI components
    ui/                   # Shared design system primitives
    learn/                # Learning workspace components
    admin/                # Admin dashboard components
    assessments/          # Assessment UI
    navigation/           # Nav bar, sidebar
  middleware.ts           # Next.js edge middleware
prisma/
  schema.prisma           # Prisma data model
  migrations/             # Database migration history
  seed.ts                 # Development seed data
```

## Authentication

Clerk manages user identity. A webhook endpoint (`src/app/api/webhooks/clerk/route.ts`) receives Clerk events, verifies Svix signatures, and synchronizes user records into PostgreSQL. API routes call `requireUser()` to resolve the authenticated user from the Clerk session and load their Prisma profile in a single query. Role checks use `requireRole()`, which throws `ForbiddenError` when the caller lacks the required role.

## Multi-Tenancy

Every data model in the Prisma schema carries a `tenantId` column. All queries include `tenantId` in their `where` clause, enforced at the service layer. The `User` model links to a `Tenant` via foreign key, and the tenant is resolved from the authenticated user context. Cross-tenant data access is architecturally prevented; no admin endpoint bypasses tenant scoping except platform-level super-admin routes, which are gated to the `PLATFORM_ADMIN` role.

## AI Pipeline

The tutoring chat route (`src/app/api/chat/route.ts`) follows this flow:

1. **Consent check** -- verify active parental consent for minors.
2. **Usage limit check** -- enforce per-tenant AI token budgets.
3. **Pre-generation guardrails** -- content safety, PII detection, escalation triggers.
4. **Prompt assembly** -- system prompt with 5R phase context, IEP accommodations, RAG context from Pinecone.
5. **Claude API call** -- streaming response via Anthropic SDK.
6. **Post-generation guardrails** -- hallucination detection, 5R compliance, IEP safety.
7. **HITL routing** -- low-confidence or flagged responses are queued for educator review.
8. **Persistence** -- assistant message, usage ledger entry, and audit log written to PostgreSQL.
9. **SSE stream** -- response streamed to the client.

## 5R Session State Machine

Each tutoring session tracks its current phase in the 5R sequence: Root, Regulate, Reflect, Restore, Reconnect. The state machine (`src/lib/five-rs/state-machine.ts`) enforces sequential phase transitions. Advancement from Regulate to Reflect requires a regulation level of 65 or higher and a sentiment score above -0.1, ensuring the student is emotionally ready for active learning. Phase transitions are recorded in the session history and used as context for prompt assembly.

## Audit Logging

All security-relevant and compliance-relevant actions are recorded via `appendImmutableAuditLog()` in `src/lib/audit.ts`. Each log entry contains a `chainHash` computed as the SHA-256 digest of the entry payload concatenated with the previous entry's hash, forming a tamper-evident chain per tenant. This chain is verifiable by replaying the hash sequence.
