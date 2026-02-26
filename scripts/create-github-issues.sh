#!/usr/bin/env bash
# =============================================================================
# create-github-issues.sh
# Idempotent: checks for existing issues before creating each one.
# Prerequisites: gh auth login (GitHub CLI authenticated)
# Usage: bash scripts/create-github-issues.sh
# =============================================================================
set -euo pipefail

REPO="SAHearn1/learning-hub"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# ─── Helper ──────────────────────────────────────────────────────────────────
create_issue_if_missing() {
  local title="$1"; shift
  local labels="$1"; shift
  local milestone="$1"; shift
  local body="$1"

  local existing
  existing=$(gh issue list --repo "$REPO" --search "\"${title}\"" --json number,title --jq '.[0].number' 2>/dev/null || echo "")
  if [[ -n "$existing" ]]; then
    log "SKIP #${existing} already exists: ${title}"
    return 0
  fi

  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --label "$labels" \
    --milestone "$milestone" \
    --body "$body"
  log "CREATED: ${title}"
}

# =============================================================================
# Phase 1 — Labels
# =============================================================================
log "Creating labels..."
gh label create "gap-p0"       --repo "$REPO" --color "d73a4a" --description "Priority 0 — Pre-launch blocker"     --force
gh label create "gap-p1"       --repo "$REPO" --color "e4e669" --description "Priority 1 — Sprint 1 post-launch"   --force
gh label create "gap-p2"       --repo "$REPO" --color "0075ca" --description "Priority 2 — Sprint 2"               --force
gh label create "test-coverage"--repo "$REPO" --color "cfd3d7" --description "Missing API test coverage"            --force
gh label create "api-consistency"--repo "$REPO" --color "e99695" --description "Routes bypassing withApiHandler"   --force
gh label create "frontend"     --repo "$REPO" --color "7057ff" --description "UI/page-level issues"                --force
gh label create "schema"       --repo "$REPO" --color "008672" --description "Prisma model gaps"                    --force
gh label create "ops"          --repo "$REPO" --color "e4e669" --description "Operations, deployment, SLOs"         --force
gh label create "monitoring"   --repo "$REPO" --color "0052cc" --description "Observability and alerting"           --force
gh label create "security"     --repo "$REPO" --color "d93f0b" --description "Auth, rate limiting, guardrails"      --force
gh label create "ci-cd"        --repo "$REPO" --color "bfd4f2" --description "CI/CD pipeline issues"               --force
log "Labels created."

# =============================================================================
# Phase 2 — Milestones
# =============================================================================
log "Creating milestones..."
gh api --repo "$REPO" repos/"$REPO"/milestones --method POST \
  -f title="P0: Pre-Launch" -f description="Must be resolved before production traffic" -f state=open 2>/dev/null || true
gh api --repo "$REPO" repos/"$REPO"/milestones --method POST \
  -f title="P1: Sprint 1"   -f description="First sprint post-launch"                   -f state=open 2>/dev/null || true
gh api --repo "$REPO" repos/"$REPO"/milestones --method POST \
  -f title="P2: Sprint 2"   -f description="Second sprint"                              -f state=open 2>/dev/null || true
log "Milestones created."

# =============================================================================
# Phase 3 — Issues
# =============================================================================
log "Creating issues..."

# ── Agent A ──────────────────────────────────────────────────────────────────
create_issue_if_missing \
  "[P0] Fix hardcoded mock student IDs in assessment pages" \
  "gap-p0,frontend" \
  "P0: Pre-Launch" \
  'src/app/assessments/diagnostic/page.tsx hard-codes `mockData = { studentId: '"'"'student-123'"'"', sessionId: '"'"'session-123'"'"', … }` and src/app/assessments/history/page.tsx hard-codes `const mockStudentId = '"'"'student-123'"'"'`. Every authenticated user sees data for the hardcoded ID.

**Fix**: Replace with `getCurrentUser()` + DB lookup.

**Acceptance criteria**:
- [ ] diagnostic page derives studentId from authenticated session
- [ ] history page derives studentId from auth
- [ ] no hardcoded IDs remain in either file
- [ ] pages render correctly for any authenticated student role'

create_issue_if_missing \
  "[P0] Add AiSuggestionReview model to Prisma schema" \
  "gap-p0,schema" \
  "P0: Pre-Launch" \
  'src/app/api/educator/reviews/route.ts contains `// TODO: Add AiSuggestionReview model to Prisma schema`. HITL review decisions cannot be persisted.

**Required fields**: id, tenantId, educatorId, sessionId, suggestionText, decision (ACCEPTED/REJECTED/MODIFIED), modifiedText (nullable), reviewedAt, createdAt.

**Acceptance criteria**:
- [ ] model added to prisma/schema.prisma
- [ ] migration generated with prisma migrate dev
- [ ] POST /api/educator/reviews writes to table
- [ ] GET /api/educator/reviews returns persisted records
- [ ] npx prisma generate passes with zero errors'

# ── Agent B ──────────────────────────────────────────────────────────────────
create_issue_if_missing \
  "[P0] Run prisma migrate deploy for LMS models in production database" \
  "gap-p0,ops" \
  "P0: Pre-Launch" \
  'LMS models (Course, Class, Assignment, Submission, Grade, FiveRTemplate, ClassEnrollment) were added locally but `prisma migrate deploy` has not been confirmed against production. All /api/lms/* routes will error in production.

**Acceptance criteria**:
- [ ] migration applied to production DB
- [ ] /api/lms/courses returns 200 in production smoke test
- [ ] confirmation step added to deployment runbook in docs/'

create_issue_if_missing \
  "[P1] Execute baseline load tests and document SLO targets" \
  "gap-p1,ops" \
  "P1: Sprint 1" \
  'tests/load/ contains k6 scripts but no results have been published. SLO targets are undefined, meaning alert thresholds in src/lib/monitoring/alerts.ts are uncalibrated.

**Acceptance criteria**:
- [ ] load tests executed against staging
- [ ] p50/p95/p99 latency per key route documented
- [ ] SLO targets formally defined and added to docs/
- [ ] alert thresholds updated to reflect measured baselines'

create_issue_if_missing \
  "[P1] Confirm and register Stripe webhook endpoint in Stripe dashboard" \
  "gap-p1,ops" \
  "P1: Sprint 1" \
  'src/app/api/stripe/webhook/route.ts is implemented and tested but the Stripe dashboard webhook pointing to the production URL is not confirmed registered.

**Acceptance criteria**:
- [ ] webhook endpoint registered in Stripe dashboard for production URL
- [ ] Stripe test event delivered and handled successfully
- [ ] subscription lifecycle confirmed end-to-end in staging'

create_issue_if_missing \
  "[P2] Source and deploy brand PNG assets to /public/brand/" \
  "gap-p2,frontend" \
  "P2: Sprint 2" \
  'BrandLogo, FiveRIcon, and FiveRStrip components reference image paths under /public/brand/ that contain no PNG files. Components render broken images in production.

**Acceptance criteria**:
- [ ] RWFW seal PNG sourced and placed at correct path
- [ ] 5 phase icon PNGs sourced (Regulate, Restore, Reflect, Reason, Reconnect)
- [ ] BrandLogo, FiveRIcon, FiveRStrip render correctly in production'

# ── Agent C ──────────────────────────────────────────────────────────────────
create_issue_if_missing \
  "[P1] Add integration tests for SRS (spaced repetition) API routes" \
  "gap-p1,test-coverage" \
  "P1: Sprint 1" \
  'All 4 SRS routes have zero test coverage: GET /api/srs/due-items, POST /api/srs/review, GET /api/srs/stats, GET /api/srs/warmup.

**Target file**: tests/integration/api/srs.test.ts

**Acceptance criteria**: ≥15 tests written, all passing, no existing tests regress.'

create_issue_if_missing \
  "[P1] Add integration tests for IRT (adaptive testing) API routes" \
  "gap-p1,test-coverage" \
  "P1: Sprint 1" \
  'All 3 IRT routes have zero test coverage: GET /api/irt/ability, GET /api/irt/next-item, POST /api/irt/calibrate.

**Target file**: tests/integration/api/irt.test.ts

**Acceptance criteria**: ≥12 tests written, all passing, no existing tests regress.'

# ── Agent D ──────────────────────────────────────────────────────────────────
create_issue_if_missing \
  "[P1] Add integration tests for Explore and Pretest API routes" \
  "gap-p1,test-coverage" \
  "P1: Sprint 1" \
  'GET /api/explore/topics, POST /api/explore/pretest, and GET /api/explore/pretest/next have no direct route contract tests.

**Target file**: tests/integration/api/explore.test.ts

**Acceptance criteria**: ≥12 tests passing.'

create_issue_if_missing \
  "[P1] Add integration tests for assessment variant routes (diagnostic, formative, summative)" \
  "gap-p1,test-coverage" \
  "P1: Sprint 1" \
  'POST /api/assessments/diagnostic, POST /api/assessments/formative, and POST /api/assessments/summative have no route-level tests beyond consent enforcement.

**Target file**: tests/integration/api/assessments-variants.test.ts

**Acceptance criteria**: ≥15 tests passing.'

create_issue_if_missing \
  "[P1] Add integration tests for Progress API routes" \
  "gap-p1,test-coverage" \
  "P1: Sprint 1" \
  'GET /api/progress and GET /api/progress/standards/[standardId] have no tests.

**Target file**: tests/integration/api/progress.test.ts

**Acceptance criteria**: ≥10 tests passing.'

create_issue_if_missing \
  "[P2] Add integration tests for Curriculum API routes" \
  "gap-p2,test-coverage" \
  "P2: Sprint 2" \
  'GET /api/curriculum/standards and GET /api/curriculum/topics have no tests.

**Target file**: tests/integration/api/curriculum.test.ts

**Acceptance criteria**: ≥8 tests passing.'

# ── Agent E ──────────────────────────────────────────────────────────────────
create_issue_if_missing \
  "[P1] Add integration tests for IEP routes and compliance/data-rights" \
  "gap-p1,test-coverage,security" \
  "P1: Sprint 1" \
  'RESOLVED in commit 9d18ea2.

Tests written:
- tests/integration/api/iep.test.ts (12 tests — GET /api/iep/context, POST /api/iep/ingest)
- tests/integration/api/compliance-data-rights.test.ts (7 tests — POST /api/compliance/data-rights)

All 19 tests pass. Known: data-rights returns 500 on unauthenticated (not 401) due to manual catch-all — tracked in Issue F-1.'

create_issue_if_missing \
  "[P1] Add integration tests for sessions/[sessionId] GET and student/classes/join" \
  "gap-p1,test-coverage" \
  "P1: Sprint 1" \
  'RESOLVED in commit 9d18ea2.

Tests written:
- tests/integration/api/sessions-detail.test.ts (11 tests — GET/PATCH/DELETE /api/sessions/[sessionId])
- tests/integration/api/student-classes.test.ts (7 tests — POST /api/student/classes/join)

All 18 tests pass.'

create_issue_if_missing \
  "[P2] Add integration tests for Admin NVC evaluation routes" \
  "gap-p2,test-coverage" \
  "P2: Sprint 2" \
  'RESOLVED in commit 9d18ea2.

Tests written in tests/integration/api/admin-nvc.test.ts (15 tests covering GET|PATCH /api/admin/nvc-evaluations, /[id], /stats).

All 15 tests pass.'

create_issue_if_missing \
  "[P2] Add integration tests for remaining admin ops and ingest routes" \
  "gap-p2,test-coverage" \
  "P2: Sprint 2" \
  'RESOLVED in commit 9d18ea2.

Tests written in tests/integration/api/admin-ops.test.ts (15 tests covering GET /super/overview, POST /interventions, GET /ingest-logs, POST /trigger-ingest).

All 15 tests pass.'

# ── Agent F ──────────────────────────────────────────────────────────────────
create_issue_if_missing \
  "[P1] Migrate 8 API routes to withApiHandler pattern" \
  "gap-p1,api-consistency" \
  "P1: Sprint 1" \
  'The following 8 routes use manual NextResponse error construction instead of withApiHandler:

1. compliance/consent
2. compliance/data-rights
3. assessments/diagnostic
4. assessments/formative
5. assessments/summative
6. irt/ability
7. irt/next-item
8. irt/calibrate

**Do not change**: webhooks/clerk, stripe/webhook, health (intentional exceptions).

**Acceptance criteria**:
- [ ] all 8 routes wrapped with withApiHandler
- [ ] error responses use AppError subclasses with machine-readable codes
- [ ] X-Request-Id present on all responses
- [ ] all existing tests still pass'

# ── Agent G ──────────────────────────────────────────────────────────────────
create_issue_if_missing \
  "[P0] Fix metrics backend for multi-instance production deployments" \
  "gap-p0,monitoring" \
  "P0: Pre-Launch" \
  'src/lib/monitoring/metrics.ts is a single-process in-memory store. In Vercel serverless or multi-container deployments, cross-instance aggregation is impossible and metrics reset on cold start. Alert rules will not fire correctly.

**Required**: Replace in-memory store with external time-series aggregator (Datadog StatsD or OpenTelemetry).

**Acceptance criteria**:
- [ ] metrics backend writes to external aggregator
- [ ] /api/metrics returns cross-instance aggregated data
- [ ] alert rules evaluated against aggregated values
- [ ] cold start does not reset historical metrics'

create_issue_if_missing \
  "[P1] Implement tenant-level rate limiting and burst quotas" \
  "gap-p1,security" \
  "P1: Sprint 1" \
  'Per-IP rate limiting exists but a single tenant with many users can exhaust AI token budgets. AIUsageLedger tracks consumption but is not plumbed into a hard tenant-level 429 throttle.

**Required**: Add tenant-scoped sliding window check inside withApiHandler or middleware. Returns 429 with Retry-After header on quota breach.

**Acceptance criteria**:
- [ ] tenant-level burst protection enforced
- [ ] 429 returned with Retry-After header
- [ ] per-tenant quota configurable by tier
- [ ] ≥5 integration test cases cover quota enforcement'

create_issue_if_missing \
  "[P1] Wire guardrail post-checks into chat streaming pipeline" \
  "gap-p1,security" \
  "P1: Sprint 1" \
  'src/app/api/chat/route.ts line 512 has // TODO: Add guardrail post-checks and HITL review when implemented. Pre-generation guardrails run but post-generation checks are not wired.

hallucination-detector.ts and post-generation content-safety modules exist in src/lib/ai/guardrails/ but are not applied to outbound responses.

**Acceptance criteria**:
- [ ] post-checks applied before response reaches client
- [ ] HITL flagging triggered on threshold breach
- [ ] all existing chat integration tests still pass
- [ ] new test cases cover the post-check rejection path'

create_issue_if_missing \
  "[P1] Fix E2E CI pipeline to run with Clerk test credentials" \
  "gap-p1,ci-cd" \
  "P1: Sprint 1" \
  '20 Playwright spec files in tests/e2e/ exist but Clerk test-mode credentials are not confirmed working in CI. Phase 0 CLAUDE.md confirms: "Full E2E auth fixture run in CI with Clerk test credentials" is still pending.

**Acceptance criteria**:
- [ ] Clerk test API key and frontend key configured as CI secrets
- [ ] E2E workflow executes all 20 spec files on CI runner
- [ ] auth fixture creates and cleans up test users successfully
- [ ] green E2E CI run on main branch'

create_issue_if_missing \
  "[P2] Consolidate duplicate billing/stripe routes and schedule data retention" \
  "gap-p2,ops" \
  "P2: Sprint 2" \
  '**(1) Duplicate billing routes**: /api/billing/checkout + /api/billing/portal have tests; /api/stripe/checkout + /api/stripe/portal appear to duplicate with no tests and no documented distinction.

**(2) Data retention scheduling**: src/lib/compliance/data-retention.ts exists but no cron job is configured — the retention policy is a no-op until scheduled.

**Acceptance criteria**:
- [ ] billing/stripe duplication resolved and documented
- [ ] data retention cron configured and documented'

log "All 22 issues processed."
gh issue list --repo "$REPO" --limit 30 --json number,title --jq '.[] | "\(.number): \(.title)"'
