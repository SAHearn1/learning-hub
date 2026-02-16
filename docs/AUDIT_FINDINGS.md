# Audit Findings — Step 0 Discovery

**Date:** 2026-02-16
**Auditor:** Orchestrator (Claude Opus 4.6)
**Repository:** `SAHearn1/learning-hub`
**Commit:** `6fe4771` (branch: `codex/enable-build-using-tasks-list-from-.md-files`)

---

## 1. Stack Identification

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Framework | Next.js (App Router) | 15.1.0 | TypeScript, server/client component split |
| UI | React + Tailwind CSS + Radix UI | 18.3 / 3.4 / 2.x | shadcn/ui component library |
| Auth | Clerk | @clerk/nextjs 5.0 | OAuth2/JWT, Svix webhook validation |
| Database | PostgreSQL via Prisma ORM | Prisma 5.20 | Remote at db.prisma.io (pooled + direct) |
| AI (LLM) | Anthropic Claude SDK | 0.30.0 | Primary reasoning engine |
| AI (Embeddings) | OpenAI SDK | 6.18.0 | Embedding generation only |
| Vector Search | Pinecone | 7.0.0 | RAG for curriculum citations |
| Cache | ioredis | 5.9.2 | Rate limiting, session state (in-memory fallback) |
| State | Zustand | 4.5.0 | Client-side stores |
| Payments | Stripe | 16.0.0 | Checkout, portal, webhooks |
| Monitoring | Sentry + Datadog | @sentry/nextjs 10.38 | Error tracking, APM |
| Testing | Vitest + Playwright | 2.0 / 1.45 | Unit/integration + E2E + a11y (axe-core) |

## 2. Build, Test & Dev Commands

```bash
# Development
npm run dev                    # Next.js dev server

# Build
npm run build                  # Production build (prisma generate + next build)

# Lint & Typecheck
npm run lint                   # ESLint
npx tsc --noEmit               # TypeScript type check

# Database
npm run db:generate            # prisma generate
npm run db:push                # prisma db push (no migration files)
npm run db:migrate             # prisma migrate dev
npm run db:migrate:deploy      # prisma migrate deploy (production)
npm run db:seed                # tsx prisma/seed.ts

# Tests
npx vitest run                 # All unit + integration tests (836 tests)
npm run test:coverage          # Vitest with coverage
npm run test:integration       # Integration tests only
npm run test:e2e               # Playwright E2E
npm run test:a11y              # Accessibility tests (axe-core)
npm run compliance:check       # COPPA/FERPA artifact validation
```

## 3. Existing Models (Prisma Schema — 858 lines)

### Multi-Tenancy & Organization
- **Tenant** — district-level tenant (slug, domain, subscription tier/status, Stripe IDs, suspension)
- **School** — school under tenant (name, address, grade range, settings)
- **User** — Clerk-synced user (clerkId, email, role, tenantId, schoolId, isMinor, consentStatus)
- **Educator** — educator profile (userId, certifications, specializations)
- **Student** — student profile (userId, gradeLevel, learningPreferences, regulationProfile)
- **Parent** — parent profile (userId, childrenIds, communicationPrefs)
- **Class** — classroom (tenantId, schoolId, educatorId, subject, gradeLevel, academicYear)
- **ClassEnrollment** — student-in-class (classId, studentId, status: ACTIVE/WITHDRAWN/COMPLETED)

### Learning & Assessment
- **Session** — tutoring session (tenantId, studentId, subject, currentPhase: 5R phases, engagementMode, metadata w/ fiveRState)
- **Message** — chat message (sessionId, role: USER/ASSISTANT/SYSTEM, content, metadata)
- **Assessment** — assessment attempt (sessionId, standardId, type, bloomsLevel, difficulty, score, feedback)
- **ThinkingAssessment** — reasoning quality rubric (6 thinking + 5 creativity dimensions)
- **ReasoningMoveProgress** — per-move mastery tracking (22 reasoning moves)
- **Progress** — mastery per student/standard (masteryLevel, assessmentCount)
- **StudentAbility** — IRT ability estimate per subject (theta, SE, confidence interval)

### Curriculum
- **Standard** — curriculum standard (code, framework, subject, gradeLevel, domain)
- **Topic** — learning topic (subject, gradeLevel, description, misconceptions, realWorldConnections)
- **LearningObjective** — topic objective (bloomsLevel, measurable)
- **Problem** — practice/diagnostic problem (stem, scaffold, solutionPaths, rubric, difficulty)

### Adaptive Assessment (IRT + SRS)
- **ItemCalibration** — IRT parameters (difficulty, discrimination, guessing, model: 1PL/2PL/3PL)
- **ResponseData** — IRT response record (isCorrect, responseTime, theta, residual)
- **ReviewSchedule** — FSRS spaced repetition schedule (stability, difficulty, state, dueDate)
- **ReviewHistory** — SRS review log (rating, state changes)

### Compliance & Governance
- **IepAccommodation** — student accommodation (10 types, parameters, active dates)
- **AuditLog** — immutable chain-hashed audit trail (action, resource, metadata, IP, chainHash)
- **NVCQualityEvaluation** — nonviolent communication check on AI responses
- **AiSuggestionReview** — HITL review queue (suggestion type, confidence, guardrail flags, decision)
- **AIUsageLedger** — token/cost tracking per request (model, tokens, cost, latency, feature)
- **IngestLog** — curriculum ingestion tracking
- **PlatformConfig** — global feature toggles

### MISSING for LMS Thin Slice
- **Term** — grading periods (not in schema)
- **Course** — course catalog (not in schema)
- **Section** — course offering / scheduled class (not in schema — `Class` is closest but lacks course linkage)
- **Assignment** — teacher-created work (not in schema)
- **Submission** — student work artifact (not in schema)
- **Grade** — score + feedback + rubric (not in schema)

## 4. Existing RBAC & Roles

### Defined Roles (6)
| Role | Scope | Defined In |
|------|-------|-----------|
| STUDENT | Self (own sessions, progress) | `src/constants/roles.ts` |
| PARENT | Children (child progress, consent) | `src/constants/roles.ts` |
| EDUCATOR | Classroom (own classes, students) | `src/constants/roles.ts` |
| SCHOOL_ADMIN | School (all classes, teachers in school) | `src/constants/roles.ts` |
| DISTRICT_ADMIN | Tenant (all schools, billing) | `src/constants/roles.ts` |
| PLATFORM_ADMIN | Global (all tenants, system config) | `src/constants/roles.ts` |

### Enforcement Mechanisms
1. **RBAC middleware** (`src/lib/middleware/rbac-middleware.ts`) — `withAuth()`, `withRole()`, `withPermission()`, `withTenantScope()`
2. **RBAC functions** (`src/lib/rbac.ts`) — `canAccessTenant()`, `assertTenantAccess()`, `isClassroomOwner()`, `assertSchoolAccess()`
3. **Permission matrix** (`src/constants/permissions.ts`) — 12 granular permissions mapped to roles
4. **Inline route checks** — `requireUser()` + role array checks in every API route
5. **Consent gating** (`src/lib/compliance.ts`) — minor consent enforcement on learning routes

### Assessment: RBAC is production-grade. No changes needed for PR3.

## 5. Existing API Routes (62 total)

### Admin (10)
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/admin/data-retention` | GET, POST | Data deletion/export |
| `/api/admin/ingest-logs` | GET | Curriculum ingestion audit |
| `/api/admin/nvc-evaluations` | GET | NVC evaluation list |
| `/api/admin/nvc-evaluations/stats` | GET | NVC statistics |
| `/api/admin/nvc-evaluations/[id]` | GET, PATCH | Review & action NVC |
| `/api/admin/super/overview` | GET | Platform admin dashboard |
| `/api/admin/super/tenants/[tenantId]/interventions` | GET | Tenant health |
| `/api/admin/super/tenants/[tenantId]/invoice` | POST | Manual invoice |
| `/api/admin/super/tenants/[tenantId]/suspension` | POST | Suspend tenant |
| `/api/admin/trigger-ingest` | POST | Manual curriculum ingest |

### Assessments (9)
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/assessments` | POST | List/create assessments |
| `/api/assessments/[id]/submit` | GET | Submit answer |
| `/api/assessments/diagnostic` | POST | Generate diagnostic |
| `/api/assessments/formative` | POST | Generate formative |
| `/api/assessments/summative` | POST | Generate summative |
| `/api/assessments/thinking` | PUT | Thinking quality assessment |
| `/api/assessments/reasoning-moves` | POST | Reasoning move tracking |
| `/api/assessments/review` | POST | Review past assessments |
| `/api/assessments/context` | GET | Assessment context |

### Chat & Sessions (3)
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/chat` | POST | Streaming tutor conversation |
| `/api/sessions` | POST, GET | Create/list sessions |
| `/api/sessions/[sessionId]` | GET | Get session detail |

### Educator (7+)
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/educator/classes` | GET, POST | List/create classes |
| `/api/educator/classes/[classId]/enroll` | POST | Enroll student |
| `/api/educator/students` | GET | List students |
| `/api/educator/reviews` | GET, POST | HITL suggestion queue |
| `/api/educator/reviews/stats` | GET | Review statistics |
| `/api/educator/compliance` | GET, POST | IEP/consent audit |
| `/api/educator/reports` | GET | Student reports |

### Parent (4)
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/parent/students` | GET | List children |
| `/api/parent/children` | GET | Alternate child list |
| `/api/parent/progress/[studentId]` | GET | Child progress |
| `/api/parent/settings` | GET, PATCH | Preferences |

### Compliance & Billing (4)
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/compliance/consent` | GET, POST, PATCH | Parental consent |
| `/api/compliance/data-rights` | POST | GDPR export/deletion |
| `/api/billing/checkout` | POST | Stripe checkout |
| `/api/billing/portal` | POST | Stripe portal |

### Curriculum & Learning (8)
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/curriculum/standards` | GET | List standards |
| `/api/curriculum/topics` | GET | List topics |
| `/api/explore/topics` | POST | Topic recommendations |
| `/api/explore/pretest` | POST | Start pretest |
| `/api/explore/pretest/next` | POST | Next pretest question |
| `/api/iep/context` | GET | Student IEP context |
| `/api/iep/ingest` | POST | IEP document ingest |
| `/api/progress` | GET | Student progress |

### IRT & SRS (7)
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/irt/ability` | POST | Ability estimate |
| `/api/irt/next-item` | POST | CAT item selection |
| `/api/irt/calibrate` | POST | Item calibration |
| `/api/srs/due-items` | GET | Due review items |
| `/api/srs/review` | POST | Log review |
| `/api/srs/stats` | GET | SRS statistics |
| `/api/srs/warmup` | POST | Warmup items |

### Operations (7)
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/health` | GET | Liveness probe |
| `/api/metrics` | GET | Observability |
| `/api/ingest` | POST | Curriculum ingest webhook |
| `/api/regulate/check-in` | POST | Regulation check-in |
| `/api/student/settings` | GET, PATCH | Student preferences |
| `/api/webhooks/clerk` | POST | Clerk user events |
| `/api/stripe/webhook` | POST | Stripe events |

## 6. Secret Findings

**Status: CLEAN — No secrets found in tree or tracked files.**

| Check | Result | Files |
|-------|--------|-------|
| .env files tracked | None | `.gitignore` excludes `.env`, `.env.local`, `.env.*.local` |
| Hardcoded API keys | None | All use `process.env.*` |
| .env.example | Placeholders only | `pk_test_xxxxx`, `sk_test_xxxxx`, `sk-ant-xxxxx` |
| CI secrets | GitHub Actions `${{ secrets.* }}` | Fallback to `_placeholder` values |
| PEM/certificates | Not tracked | `.gitignore` excludes `*.pem` |

**Remaining risk:** No automated secret scanner (gitleaks/truffleHog) in CI to prevent regression.

## 7. Drift & Naming Findings

| Finding | Location | Impact | Recommendation |
|---------|----------|--------|---------------|
| `Class` model vs spec's `Section` | `prisma/schema.prisma` | Naming mismatch — spec wants Course→Section→Enrollment | Rename `Class` → `Section` OR keep `Class` and add `Course` linking to it |
| `ClassEnrollment` vs `Enrollment` | `prisma/schema.prisma` | Minor naming — current name is more specific | Keep as-is, add `CourseSection` if needed |
| Brand tokens in CSS vs JSON | `src/brand/tokens.css` | Spec requires `/styles/tokens.json` (exact format given) | Create `tokens.json` per spec; CSS tokens can coexist |
| SVG logos vs PNG assets | `src/components/brand/` | Spec requires PNGs in `/public/brand/` | Add PNGs (RWFW seal, 5R icons) alongside SVG components |
| `FiveRStrip` missing | — | Spec requires reusable strip component | Create `FiveRStrip.tsx` using existing `rootwork-icon.tsx` |
| No `/styles/` directory | — | Spec expects `/styles/tokens.json` | Create directory |
| Docs scattered vs spec structure | `/docs/` | Some spec-required docs exist under different names | Create formal versions: ARCHITECTURE.md, PRODUCT_VISION.md, etc. |
| README describes "AI agent factory" | `README.md` | Identity drift — should describe "RootWork Learning Hub" | Rewrite README for LMS identity |

## 8. Recommended PR Merge Order

```
PR0  security/secrets-scrub-and-history-rewrite     ← First (unblocks everything)
 │
PR1  docs/reposition-rootwork-lms                   ← Parallel with PR0
PR2  brand/rootwork-brand-system-and-embedding       ← Parallel with PR0
 │
PR3  platform/rbac-role-routing-hardening            ← Already ~100% done; validate + formalize
 │
PR4  lms/data-model-and-migrations                  ← CRITICAL PATH — blocks PR5, PR6
 │
PR5  lms/core-apis                                  ← Depends on PR4
 │
PR6  lms/core-ui-thin-slice                         ← Depends on PR5
 │
PR7  rootwork/5r-daily-learning-module              ← Mostly done; add template builder
PR8  ai/governance-role-based-tools-evals           ← Mostly done; add docs + PD assistant
 │
PR9  ops/ci-quality-gates-observability             ← Last (adds gates for all above)
```

**Critical path:** PR0 → PR4 → PR5 → PR6 (LMS thin slice)
**Parallel tracks:** PR1, PR2, PR3, PR7, PR8 can develop concurrently
**Final gate:** PR9 adds CI enforcement after all features land

## 9. Existing Reusable Primitives

| Spec Need | Existing Primitive | Reuse Strategy |
|-----------|-------------------|----------------|
| Section/Classroom | `Class` model + `ClassEnrollment` | Extend `Class` with course linkage, or rename to `Section` |
| Enrollment | `ClassEnrollment` | Already handles student↔class with status |
| Student roster | `/api/educator/students` | Extend for section-scoped views |
| Parent progress | `/api/parent/progress/[studentId]` | Extend with assignment/grade data |
| Educator dashboard | `/educator/dashboard/` | Add assignment/grade management cards |
| RBAC enforcement | Full middleware + function stack | Reuse for all new LMS routes |
| Audit logging | `appendImmutableAuditLog()` | Call from new LMS mutation endpoints |
| API handler | `withApiHandler()` | Wrap all new routes |
| Error classes | `AppError` hierarchy | Reuse for LMS-specific errors |
| Content safety | Guardrails engine | Apply to any AI-assisted grading features |
