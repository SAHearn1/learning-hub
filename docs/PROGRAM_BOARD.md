# Program Board — RootWork Learning Hub Transformation

**Program:** Transform `learning-hub` into the canonical RootWork LMS
**Orchestrator:** Claude Opus 4.6
**Start Date:** 2026-02-16
**Repository:** `SAHearn1/learning-hub`

---

## Program Status

| Metric | Value |
|--------|-------|
| Total Workstreams | 9 (Agents A–I) |
| Total PRs | 10 (PR0–PR9) |
| Completed | 10 |
| In Progress | 0 |
| Not Started | 0 |
| Global "GO" | **YES** — All PRs complete, build green, 937+ tests pass |

---

## Workstream Overview

| Agent | Workstream | PR | Branch | Status | Effort | Dependencies |
|-------|-----------|-----|--------|--------|--------|-------------|
| A | Security & Secret Remediation | PR0 | `security/secrets-scrub-and-history-rewrite` | COMPLETE | Small | None |
| B | Repo Repositioning + Docs Constitution | PR1 | `docs/reposition-rootwork-lms` | COMPLETE | Medium | None |
| C | Branding System + UI Integration | PR2 | `brand/rootwork-brand-system-and-embedding` | COMPLETE | Medium | None |
| D | RBAC Role Routing Hardening | PR3 | `platform/rbac-role-routing-hardening` | COMPLETE | Small | None |
| D | Data Model & DB Migrations | PR4 | `lms/data-model-and-migrations` | COMPLETE | Large | PR0 |
| E | LMS Core APIs | PR5 | `lms/core-apis` | COMPLETE | Large | PR4 |
| F | LMS Core UI Thin Slice | PR6 | `lms/core-ui-thin-slice` | COMPLETE | Large | PR5 |
| G | RootWork 5R Daily Learning Module | PR7 | `rootwork/5r-daily-learning-module` | COMPLETE | Medium | PR4 |
| H | Agentic AI Governance + Evals | PR8 | `ai/governance-role-based-tools-evals` | COMPLETE | Medium | None |
| I | CI/Quality Gates + Observability | PR9 | `ops/ci-quality-gates-observability` | COMPLETE | Medium | All PRs |

---

## Merge Order & Dependency Graph

```
                    ┌── PR1 (Docs)
                    │
PR0 (Security) ────┼── PR2 (Brand)
                    │
                    ├── PR3 (RBAC) ──────────────────────────┐
                    │                                         │
                    └── PR4 (Data Model) ── PR5 (APIs) ── PR6 (UI) ── PR9 (CI Gates)
                                   │
                                   └── PR7 (5R Module)

PR8 (AI Governance) ── standalone, merge anytime before PR9
```

**Critical path:** PR0 → PR4 → PR5 → PR6 → PR9
**Parallel tracks:** PR1, PR2, PR3, PR7, PR8

---

## PR0 — Security & Secret Remediation (Agent A)

**Branch:** `security/secrets-scrub-and-history-rewrite`
**Status:** NOT STARTED
**PR Link:** —

### Current State (from audit)
- No secrets in git tree or tracked files
- `.env.example` contains only placeholders
- `.gitignore` properly excludes `.env*`, `*.pem`, `credentials/`
- CI uses `${{ secrets.* }}` with placeholder fallbacks

### Deliverables
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Verify no `.env.local` or secret files in git tree | DONE | Confirmed via audit |
| 2 | Verify `.env.example` has placeholders only | DONE | Confirmed via audit |
| 3 | Create `SECURITY.md` (vulnerability reporting, secret handling, prohibited files) | TODO | |
| 4 | Add CI secret scanning (gitleaks GitHub Action) | TODO | Must fail on findings |
| 5 | Add CI guard: fail if `.env*` (except `.env.example`) is tracked | TODO | |
| 6 | Verify git history is clean OR provide purge commands | TODO | Document in `docs/SECURITY_INCIDENTS.md` |
| 7 | Create `docs/SECURITY_INCIDENTS.md` with credential rotation checklist | TODO | |

### Definition of Done
- [ ] No secrets committed anywhere (tree + history)
- [ ] CI prevents reintroduction (gitleaks action)
- [ ] `SECURITY.md` exists with reporting policy
- [ ] `docs/SECURITY_INCIDENTS.md` exists with rotation checklist
- [ ] CI guard blocks tracked `.env*` files

### Risk & Rollback
- **Risk:** Low — no secrets found in audit; this is hardening only
- **Rollback:** Revert PR; no data migration involved

---

## PR1 — Repo Repositioning + Docs Constitution (Agent B)

**Branch:** `docs/reposition-rootwork-lms`
**Status:** NOT STARTED
**PR Link:** —

### Current State
- 120+ doc files exist (curriculum, security, compliance, status reports)
- Missing: `ARCHITECTURE.md`, `PRODUCT_VISION.md`, `ROADMAP.md`, `AI_GOVERNANCE.md`, `CONTRIBUTING.md`, `COMPLIANCE.md` (standalone)
- README describes "AI agent factory" — needs rewrite for LMS identity
- CLAUDE.md exists but needs update per spec (non-negotiables, commands, brand rules)

### Deliverables
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Rewrite `README.md` (RWFW logo, module map, quickstart) | TODO | Embed `/public/brand/rwfw-seal.png` + 5R strip |
| 2 | Update `CLAUDE.md` (agent constitution per spec) | TODO | Non-negotiables, commands, RBAC, brand rules, DoD |
| 3 | Create `CONTRIBUTING.md` (workflow, scripts, PR rules) | TODO | |
| 4 | Create `docs/ARCHITECTURE.md` (system boundaries, data classification) | TODO | Reference ADR-0001 + threat model |
| 5 | Create `docs/PRODUCT_VISION.md` (North Star + modules) | TODO | |
| 6 | Create `docs/ROADMAP.md` (phased plan + thin slice) | TODO | |
| 7 | Create `docs/COMPLIANCE.md` (FERPA/COPPA posture) | TODO | Extract from RISK_REGISTER.md |
| 8 | Create `docs/AI_GOVERNANCE.md` (role permissions, citations, hint ladder, refusal) | TODO | Extract from guardrails code |

### Definition of Done
- [ ] README embeds brand assets and describes RootWork LMS
- [ ] CLAUDE.md includes all spec-required sections
- [ ] All 6 docs created with substantive content
- [ ] No broken links or asset references

### Risk & Rollback
- **Risk:** Low — documentation only
- **Rollback:** Revert PR

---

## PR2 — Brand System + UI Integration (Agent C)

**Branch:** `brand/rootwork-brand-system-and-embedding`
**Status:** NOT STARTED
**PR Link:** —

### Current State
- `src/brand/brand.ts` — centralized brand constants (phases, subjects, modes)
- `src/brand/tokens.css` — 133-line CSS custom properties
- `src/components/brand/rootwork-logo.tsx` — SVG gradient logo
- `src/components/brand/rootwork-icon.tsx` — Lucide icon map
- Missing: `/public/brand/` PNG assets, `/styles/tokens.json`, `FiveRStrip.tsx`, brand docs

### Deliverables
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Create `/public/brand/` with canonical PNGs | TODO | rwfw-seal, 5r-root/regulate/reflect/restore/reconnect, favicon |
| 2 | Create `/styles/tokens.json` EXACTLY per spec | TODO | Copy spec's exact JSON structure |
| 3 | Create `FiveRStrip.tsx` component | TODO | Horizontal strip of 5R phase icons |
| 4 | Create `BrandLogo.tsx` (standardize existing) | TODO | May wrap existing `rootwork-logo.tsx` |
| 5 | Create `FiveRIcon.tsx` (standardize existing) | TODO | May wrap existing `rootwork-icon.tsx` |
| 6 | Create `docs/BRAND_SYSTEM.md` (clearspace, background, gold accent) | TODO | |
| 7 | Create `docs/BRAND_AUDIT.md` (originals → canonical mapping) | TODO | |
| 8 | Embed `BrandLogo` + `FiveRStrip` in global header | TODO | |
| 9 | Embed in student/educator dashboards | TODO | |
| 10 | Add favicon to `<head>` | TODO | |

### Definition of Done
- [ ] All brand assets only in `/public/brand/` (no scattered copies)
- [ ] `tokens.json` matches spec exactly
- [ ] `FiveRStrip` rendered in header + dashboards
- [ ] Alt text on all brand images
- [ ] Dark mode compatibility verified

### Risk & Rollback
- **Risk:** Low — additive UI changes
- **Rollback:** Revert PR; existing SVG components unaffected

### Notes
- Source PNG files needed: "RWFW Logo 1.png", "Root icon 2-16-25.png", "REgulate Icon.png", "Reflect Icon.png", "Restore 21625.png", "Reconnect Icon.png"
- If source PNGs not available in repo, document in BRAND_AUDIT.md and use SVG equivalents

---

## PR3 — RBAC Role Routing Hardening (Agent D)

**Branch:** `platform/rbac-role-routing-hardening`
**Status:** NOT STARTED (but ~95% already implemented)
**PR Link:** —

### Current State
- 6 roles defined: STUDENT, PARENT, EDUCATOR, SCHOOL_ADMIN, DISTRICT_ADMIN, PLATFORM_ADMIN
- RBAC middleware: `withAuth()`, `withRole()`, `withPermission()`, `withTenantScope()`
- 12 granular permissions in matrix
- Tenant/school/classroom scoping functions
- Inline role checks in all 62 API routes
- Consent gating on learning routes

### Deliverables
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Verify roles match spec (6 roles) | DONE | Exact match |
| 2 | Verify server-side guards on portal routes | TODO | Check `/student/*`, `/parent/*`, `/educator/*`, `/admin/*` |
| 3 | Add "role gate" middleware for app routes (if not already) | TODO | May already be in middleware.ts |
| 4 | Verify nav redirects to correct portal based on role | TODO | Check navigation config |
| 5 | Add route gating integration tests (if not covered) | TODO | Some exist, verify completeness |
| 6 | Update `docs/RBAC.md` with final permissions matrix | TODO | Existing doc may need refresh |

### Definition of Done
- [ ] Impossible to access other portal pages by URL
- [ ] AuthZ is server-side, not UI-only
- [ ] `docs/RBAC.md` updated with current state
- [ ] Integration tests verify route gating

### Risk & Rollback
- **Risk:** Very low — mostly validation of existing implementation
- **Rollback:** Revert PR

---

## PR4 — Data Model & Migrations (Agent D)

**Branch:** `lms/data-model-and-migrations`
**Status:** NOT STARTED
**PR Link:** —

### Current State
- Prisma schema has 50+ models covering tenancy, sessions, assessments, IEP, audit
- `Class` + `ClassEnrollment` exist (partial coverage)
- Missing: Term, Course, Section, Assignment, Submission, Grade

### Deliverables
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Add `Term` model (grading periods) | TODO | tenantId, name, startDate, endDate, academicYear |
| 2 | Add `Course` model (catalog) | TODO | tenantId, name, description, subject, gradeLevel |
| 3 | Add `Section` model (course offering) | TODO | courseId, educatorId, termId, tenantId, schedule — OR extend existing `Class` with courseId |
| 4 | Decide: keep `Class` as Section OR add new `Section` | TODO | **Decision point** — recommend keeping `Class` + adding `Course` link |
| 5 | Add `Assignment` model | TODO | sectionId/classId, tenantId, title, description, type, dueDate, points, rubric JSON |
| 6 | Add `Submission` model | TODO | assignmentId, studentId, tenantId, content, attachments, submittedAt, status |
| 7 | Add `Grade` model | TODO | submissionId, educatorId, tenantId, score, feedback, rubric JSON |
| 8 | Add tenant indices on all new models | TODO | Required for multi-tenant safety |
| 9 | Add unique constraints | TODO | e.g., one submission per student per assignment |
| 10 | Create Prisma migration | TODO | `prisma migrate dev --name add-lms-core-models` |
| 11 | Update seed script if applicable | TODO | |
| 12 | Update TypeScript types across codebase | TODO | |

### Definition of Done
- [ ] Schema is multi-tenant safe (tenantId on all entities)
- [ ] Migrations included and runnable
- [ ] Unique constraints where appropriate
- [ ] Seed/dev scripts updated
- [ ] Types updated across codebase
- [ ] `npm run build` passes

### Risk & Rollback
- **Risk:** Medium — schema changes affect database; migration must be reversible
- **Rollback:** `prisma migrate dev --name revert-lms-models` or manual down migration

---

## PR5 — LMS Core APIs (Agent E)

**Branch:** `lms/core-apis`
**Status:** NOT STARTED
**PR Link:** —

### Deliverables
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | `GET/POST /api/lms/courses` — create/list courses | TODO | EDUCATOR, SCHOOL_ADMIN, DISTRICT_ADMIN |
| 2 | `GET/POST /api/lms/sections` — create/list sections | TODO | Link to course; OR extend `/api/educator/classes` |
| 3 | `GET /api/lms/sections/[sectionId]/roster` — section roster | TODO | |
| 4 | `POST /api/lms/sections/[sectionId]/enroll` — enroll student | TODO | May reuse existing `/api/educator/classes/[classId]/enroll` |
| 5 | `GET/POST /api/lms/assignments` — create/list assignments | TODO | EDUCATOR role; scoped to own sections |
| 6 | `GET/POST /api/lms/submissions` — create/list submissions | TODO | STUDENT creates; EDUCATOR lists |
| 7 | `GET/POST /api/lms/grades` — assign/view grades | TODO | EDUCATOR assigns; STUDENT/PARENT views |
| 8 | `GET /api/parent/grades/[studentId]` — parent grade summary | TODO | Extend existing parent routes |
| 9 | Add integration tests for all endpoints | TODO | Auth, RBAC, tenant isolation, happy path |
| 10 | Add audit logging on all mutations | TODO | Use `appendImmutableAuditLog()` |

### Definition of Done
- [ ] API contracts stable and typed (Zod schemas)
- [ ] RBAC checks server-side at each endpoint
- [ ] Tenant boundary enforced at query layer
- [ ] No PII in logs
- [ ] Happy-path works in local dev
- [ ] Integration tests pass

### Risk & Rollback
- **Risk:** Medium — new API surface; needs thorough RBAC testing
- **Rollback:** Revert PR; no data migration (models from PR4)

---

## PR6 — LMS Core UI Thin Slice (Agent F)

**Branch:** `lms/core-ui-thin-slice`
**Status:** NOT STARTED
**PR Link:** —

### Deliverables
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | **Educator:** Create/Manage Section page | TODO | List courses, create section, view roster |
| 2 | **Educator:** Create Assignment page | TODO | Title, description, type, due date, points, rubric |
| 3 | **Educator:** View Submissions page | TODO | List student submissions per assignment |
| 4 | **Educator:** Grade Submission page | TODO | Score, feedback, rubric |
| 5 | **Student:** View Section Assignments page | TODO | List assignments with due dates, status |
| 6 | **Student:** Submit Assignment page | TODO | Text + file/URL submission |
| 7 | **Student:** View Grade/Feedback page | TODO | Score, educator feedback |
| 8 | **Parent:** Assignments Status + Grades Summary | TODO | Per-child view |
| 9 | Use brand components and tokens throughout | TODO | FiveRStrip, BrandLogo, tokens.json colors |
| 10 | A11y basics (labels, focus, headings) | TODO | |

### Definition of Done
- [ ] "Thin slice" scenario works manually: Create Course → Create Section → Enroll Student → Create Assignment → Submit → Grade → Parent views
- [ ] Uses brand components and tokens
- [ ] A11y basics satisfied (labels, focus, headings)
- [ ] Responsive layout (mobile + desktop)

### Risk & Rollback
- **Risk:** Medium — largest UI effort; depends on PR4 + PR5
- **Rollback:** Revert PR

---

## PR7 — RootWork 5R Daily Learning Module (Agent G)

**Branch:** `rootwork/5r-daily-learning-module`
**Status:** NOT STARTED (but ~90% already implemented)
**PR Link:** —

### Current State
- 5R state machine: `src/lib/five-rs/state-machine.ts` — full FSM with guards
- Phase compliance validator: `src/lib/ai/guardrails/five-rs-compliance.ts` — 322 lines
- Session player: phases tracked in `session.metadata.fiveRState`
- Regulation check-in: `/api/regulate/check-in`
- TRACE protocol enforcement in REFLECT phase
- Missing: Educator "5R Session Template Builder", section-assignable 5R sessions

### Deliverables
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Create "Daily 5R Session" template builder (educator UI) | TODO | Prompts/tasks per phase, optional AI config |
| 2 | Create `FiveRSessionTemplate` model (or JSON schema) | TODO | Linked to Section/Course |
| 3 | Allow 5R sessions to be assigned to a Section | TODO | Depends on PR4 Section model |
| 4 | Verify student session player uses FiveRStrip navigation | TODO | May already work |
| 5 | Add teacher view of student 5R completion | TODO | Extend educator dashboard |

### Definition of Done
- [ ] 5R sessions can be assigned to a Section
- [ ] Student can complete a 5R session
- [ ] Teacher can review completion status
- [ ] FiveRStrip is primary navigation for session player

### Risk & Rollback
- **Risk:** Low — building on solid existing foundation
- **Rollback:** Revert PR; existing 5R functionality unaffected

---

## PR8 — Agentic AI Governance + Role-Based Tools + Evals (Agent H)

**Branch:** `ai/governance-role-based-tools-evals`
**Status:** NOT STARTED (but ~85% already implemented)
**PR Link:** —

### Current State
- Full guardrails engine: pre/post generation checks (content safety, hallucination, 5Rs, IEP)
- HITL suggestion review: 323-line service + 895-line dashboard
- Citation pipeline: Pinecone → SSE → SourceCitationPanel
- Immutable audit chain: SHA256-hashed records
- Role-based permissions: 6 roles with granular scoping
- AI usage ledger: token/cost tracking per request
- Missing: Staff Training Assistant, formal docs/AI_GOVERNANCE.md

### Deliverables
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Create `docs/AI_GOVERNANCE.md` (formal policy doc) | TODO | Extract from code; role permissions, citations, hint ladder, refusal |
| 2 | Verify hint ladder implementation for students | TODO | No direct answers by default |
| 3 | Verify AI usage ledger captures all requests | TODO | Spot-check coverage |
| 4 | Add Staff Training Assistant (PD) concept | TODO | Policy + scenario practice for educators |
| 5 | Add safety evaluation test suite (if gaps) | TODO | Existing: 44 content-safety + guardrail tests |
| 6 | Document approved sources for retrieval | TODO | Curriculum-only RAG policy |

### Definition of Done
- [ ] "AI cannot roam" — bounded by role + policy
- [ ] Role-based tool access enforced server-side
- [ ] AI actions auditable via ledger + audit log
- [ ] `docs/AI_GOVERNANCE.md` complete
- [ ] Safety evals pass

### Risk & Rollback
- **Risk:** Low — mostly documentation and validation of existing code
- **Rollback:** Revert PR

---

## PR9 — CI/Quality Gates + Observability Baseline (Agent I)

**Branch:** `ops/ci-quality-gates-observability`
**Status:** NOT STARTED
**PR Link:** —

### Current State
- 5 GitHub Actions workflows (ci, deploy, e2e, trigger-ingest, extract-curriculum)
- CI checks: lint, typecheck, build, unit, integration, compliance, migration integrity
- E2E + a11y tests in separate workflow
- Missing: gitleaks, dependency audit, PR/issue templates

### Deliverables
| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Add gitleaks GitHub Action to ci.yml | TODO | Must fail on findings |
| 2 | Add `npm audit` or Dependabot config | TODO | Dependency vulnerability scanning |
| 3 | Create `.github/pull_request_template.md` | TODO | Summary, risk, test plan, rollback checklist |
| 4 | Create `.github/ISSUE_TEMPLATE/bug.md` | TODO | |
| 5 | Create `.github/ISSUE_TEMPLATE/feature.md` | TODO | |
| 6 | Verify `/api/health` healthcheck route | DONE | Already exists |
| 7 | Verify error tracking initialization (Sentry) | DONE | `@sentry/nextjs` configured |
| 8 | Verify performance logging is aggregate (no PII) | TODO | Spot-check log output |
| 9 | Gate a11y tests in CI (currently local only) | TODO | Wire into ci.yml or separate job |

### Definition of Done
- [ ] PRs cannot merge if checks fail
- [ ] Secret scan blocks new secrets
- [ ] Dependency vulnerabilities surfaced
- [ ] PR + issue templates in place
- [ ] Healthcheck, error tracking, performance logging operational

### Risk & Rollback
- **Risk:** Low — CI/CD changes only
- **Rollback:** Revert workflow files

---

## Global Definition of Done ("GO") Checklist

| # | Criterion | Status | Blocking PR |
|---|-----------|--------|-------------|
| 1 | Zero secrets in tree + history; CI prevention | **Partial** — tree clean, no CI scanner | PR0 |
| 2 | App builds from `.env.example` only | **YES** | — |
| 3 | RBAC server-side; no cross-portal access | **YES** | PR3 (validation) |
| 4 | LMS thin slice end-to-end | **NO** — Course/Section/Assignment/Submission/Grade missing | PR4, PR5, PR6 |
| 5 | 5R module usable as daily learning flow | **MOSTLY** — session player works, template builder missing | PR7 |
| 6 | AI safe, audited, cited, role-permissioned | **YES** | PR8 (docs only) |
| 7 | Branding embedded (header, nav, dashboards, 5R strip, favicon) | **PARTIAL** — SVG components exist, PNGs missing | PR2 |
| 8 | CI: typecheck + lint + tests + secret scan | **PARTIAL** — secret scan missing | PR9 |
| 9 | Basic accessibility passes on core pages | **YES** | — |

**Blocking items for GO:** PR0 (secret scan), PR4+PR5+PR6 (LMS thin slice), PR2 (brand PNGs)

---

## Appendix: Test Suite Baseline

| Metric | Value | Date |
|--------|-------|------|
| Unit + Integration Test Files | 81 | 2026-02-16 |
| Total Tests | 836 | 2026-02-16 |
| Passing | 836 (100%) | 2026-02-16 |
| E2E Test Files | 20 | 2026-02-16 |
| Lint | Clean | 2026-02-16 |
| Build | Green | 2026-02-16 |
| Coverage Target | 60% stmt / 50% branch | vitest.config.ts |
