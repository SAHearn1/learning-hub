# Launch Blockers — Parallel Agent Assignment Plan

This plan assigns one focused implementation/validation agent per blocking issue so work can proceed in parallel without stepping on shared files.

## Agent Allocation (Run in Parallel)

| Agent | Blocker | Primary Goal | Primary Code Surface |
|---|---|---|---|
| Agent A | Clerk Webhook Database Sync | Ensure Clerk signup/update/delete events persist users and membership changes to DB | `src/app/api/webhooks/clerk/route.ts`, `src/lib/auth/*`, `prisma/schema.prisma`, webhook tests |
| Agent B | Chat Session Persistence | Verify every chat message/request-response pair is committed and queryable by session | `src/app/api/chat/*`, `src/app/api/sessions/*`, Prisma chat models, integration tests |
| Agent C | E2E Auth Fixtures | Unskip and stabilize 50+ auth-gated E2E tests with reusable fixtures | `tests/e2e/**`, Playwright config/fixtures, test seed scripts |
| Agent D | Deployment Automation | Add automated deploy stage to CI/CD with protected branch workflow and smoke checks | `.github/workflows/*`, deployment config (`vercel.json` / platform files) |
| Agent E | Payment Webhook Validation | Enforce and test Stripe signature verification + replay safety | `src/app/api/stripe/webhook/route.ts`, billing services, Stripe webhook tests |
| Agent F | Admin Dashboard Completion | Verify tenant management UI is complete and wired to backend actions | `src/app/(admin)/**`, admin API routes, admin E2E/integration tests |

## Parallel Execution Rules

1. **Branch strategy**: each agent works on `launch/<agent>-<topic>` branch and only rebases onto `main` at handoff.
2. **Ownership**: avoid shared edits except intentionally coordinated files (`prisma/schema.prisma`, shared test setup).
3. **Contract-first sync** (daily):
   - API contract deltas
   - migration changes
   - fixture/seed schema changes
4. **Definition of done**: each agent must ship code + tests + runbook notes.

## Detailed Work Packets

### Agent A — Clerk Webhook Database Sync

**Deliverables**
- Idempotent upsert for user create/update events.
- Safe handling for user delete/suspend transitions.
- Mapping between Clerk IDs and internal user/tenant membership records.
- Integration tests using signed webhook payload fixtures.

**Validation commands**
- `npm run test -- tests/integration/api/webhooks.clerk.test.ts --run`
- `npm run test:integration -- webhooks`

**Exit criteria**
- New signup appears in DB within webhook transaction.
- Replayed webhook does not duplicate user rows.

---

### Agent B — Chat Session Persistence

**Deliverables**
- Persist user + assistant messages for each chat turn.
- Verify session lookup returns complete ordered history.
- Ensure transaction boundaries prevent partial writes.

**Validation commands**
- `npm run test -- tests/integration/api/chat.test.ts --run`
- `npm run test -- tests/integration/api/sessions*.test.ts --run`

**Exit criteria**
- Chat history survives page refresh and new request cycle.
- No orphaned message rows under failure injection.

---

### Agent C — E2E Auth Fixtures

**Deliverables**
- Shared signed-in fixtures for student/educator/admin personas.
- Remove skip markers for auth-dependent suites.
- Deterministic seed/reset around each worker.

**Validation commands**
- `npx playwright test tests/e2e --reporter=line`
- `npx playwright test tests/e2e/auth --reporter=line`

**Exit criteria**
- 50+ previously skipped tests re-enabled.
- Flake rate under agreed threshold (target <2%).

---

### Agent D — Deployment Automation

**Deliverables**
- CI workflow with build/test gates and deploy job.
- Environment-specific deploy controls (preview vs production).
- Post-deploy smoke check + rollback note.

**Validation commands**
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

**Exit criteria**
- Merged code auto-deploys through CI without manual intervention.
- Failed checks block deploy.

---

### Agent E — Payment Webhook Validation

**Deliverables**
- Strict Stripe signature verification using raw body.
- Replay/duplicate-event protection keyed by Stripe event ID.
- Negative-path tests for invalid signatures and tampered payloads.

**Validation commands**
- `npm run test -- tests/integration/api/billing-checkout.test.ts --run`
- `npm run test -- tests/integration/api/stripe-webhook*.test.ts --run`

**Exit criteria**
- Invalid signatures return non-2xx and do not mutate billing state.
- Valid events update subscription state exactly once.

---

### Agent F — Admin Dashboard Completion

**Deliverables**
- Tenant list/detail/edit flows confirmed complete.
- Role/seat/plan management actions connected to backend.
- Empty/loading/error states implemented.
- Admin journey E2E coverage.

**Validation commands**
- `npm run test -- tests/integration/api/admin*.test.ts --run`
- `npx playwright test tests/e2e/admin --reporter=line`

**Exit criteria**
- Admin can manage tenants end-to-end from UI without manual DB edits.
- No blocker-level missing UI routes/actions.

## Coordination Cadence

- **Twice-daily sync (15 min)**: risks, migration collisions, contract changes.
- **Shared blocker board fields**: owner, status, risk, ETA, dependency.
- **Final launch gate meeting**: all six agents demo plus evidence links.

## Recommended Sequencing (While Still Parallel)

1. Start **A + E + D** immediately (webhook integrity and deploy safety).
2. Start **B + C** once test seed contracts are aligned.
3. Start **F** in parallel, but freeze UI API contract after first sync.

This sequence maximizes throughput while reducing integration churn for auth, billing, and deployments.
