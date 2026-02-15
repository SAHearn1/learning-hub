# Build Remediation Task List — 2026-02-15

This task list is derived from:

- `docs/status/build-status-assessment-2026-02-15.md`
- `PRODUCTION_READINESS_CHECKLIST.md`
- `docs/evidence/C-01/README.md`
- `docs/status/daily/2026-02-12-digest.md`
- `docs/status/weekly/2026-W07-scorecard.md`

## Priority 0 — Restore Green Build

### P0-1: Fix Prisma JSON metadata typing in chat route
- **Problem:** Build fails at `src/app/api/chat/route.ts:390` (`null` not assignable to Prisma JSON metadata input type).
- **Actions:**
  1. Replace `null` assignment with a Prisma-compatible JSON null value or omit metadata when empty.
  2. Add/update unit coverage for the affected code path (personal trade advice refusal branch).
  3. Run local compile validation.
- **Acceptance Criteria:**
  - `npm run build` passes locally.
  - No TypeScript errors in `src/app/api/chat/route.ts`.

### P0-2: Verify lint/type/test baseline for merge gating
- **Problem:** Policy requires strict CI gating before merge to `main`.
- **Actions:**
  1. Confirm required checks run in CI: lint, type-check/build, unit tests, integration tests, security/compliance checks.
  2. Ensure no soft-fail behavior on required checks.
  3. Document results in the C-01 evidence bundle.
- **Acceptance Criteria:**
  - Required checks are enforced as blocking in CI.
  - Evidence links and verifier notes are added to C-01 docs.

## Priority 1 — Close Evidence and Verification Gaps

### P1-1: Complete C-01 validation evidence
- **Problem:** `docs/evidence/C-01/README.md` still has pending fail/pass CI URLs and pending verifier sign-off.
- **Actions:**
  1. Add CI run URL for expected failing case.
  2. Add CI run URL for passing/recovery case.
  3. Record verifier name/date/result.
- **Acceptance Criteria:**
  - All `_pending_` placeholders are replaced.
  - C-01 evidence bundle is auditable and complete.

### P1-2: Resolve blocked CI policy workstream item in daily status
- **Problem:** Daily digest marks C-01 as blocked (integration segmentation + coverage gate policy finalization).
- **Actions:**
  1. Decide integration segmentation strategy and implement workflow updates.
  2. Finalize coverage threshold policy and enforce it in CI.
  3. Update daily digest with unblocked state and ETA closure.
- **Acceptance Criteria:**
  - C-01 no longer appears in blocker table.
  - CI policy hardening item marked complete in subsequent status update.

## Priority 2 — Readiness Tracking and Go/No-Go Alignment

### P2-1: Reconcile checklist claims vs current status
- **Problem:** Production checklist shows both completed baseline items and substantial unresolved go/no-go requirements.
- **Actions:**
  1. Re-validate each checked item against current CI/runtime evidence.
  2. Correct overstated checkmarks where evidence is not current.
  3. Add “last verified date” metadata for high-risk checklist sections.
- **Acceptance Criteria:**
  - Checklist reflects evidence-backed current state.
  - No contradictory status signals in the same document.

### P2-2: Improve weekly scorecard evidence completeness
- **Problem:** Weekly scorecard reports low overall readiness and low evidence completeness.
- **Actions:**
  1. Add sign-offs for A-01/S-01/C-01 as each verification closes.
  2. Track P0 completion burndown explicitly week-over-week.
  3. Publish next scorecard with updated completeness and readiness percentages.
- **Acceptance Criteria:**
  - Evidence completeness and verifier sign-off counts increase measurably.
  - P0 completion moves from planning to closed execution.

## Execution Sequence (Recommended)

1. **P0-1** Restore local build green.
2. **P0-2** Ensure required CI gates are blocking.
3. **P1-1** Fill C-01 evidence placeholders.
4. **P1-2** Close daily blocker entry for C-01.
5. **P2-1** Reconcile checklist accuracy.
6. **P2-2** Update weekly scorecard with verified progress.

## Suggested Owners (Draft)

- **Build/type fix (P0-1):** API/backend engineer
- **CI policy + evidence (P0-2, P1-1, P1-2):** DevOps + QA lead + independent verifier
- **Readiness docs (P2-1, P2-2):** Program/operations owner with verifier support
