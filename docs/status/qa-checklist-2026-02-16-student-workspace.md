# QA Checklist - Student Workspace Operability (2026-02-16)

## Build and Test Gates

- [x] `npm run build` passes.
- [x] Targeted workflow tests pass (sessions, settings API, regulate API, nav config).
- [ ] Full integration suite pass captured for this change set.
- [ ] Full Playwright student E2E suite pass captured for this change set.

## Student Workspace Cards

- [x] Learn card opens setup and can start session successfully.
- [x] Explore card loads recommendations/pretest flow.
- [x] Financial Literacy (learn) preselects subject in learn setup.
- [x] Browse Curriculum card loads curriculum listing.
- [x] Financial Literacy (curriculum) loads filtered curriculum view.
- [x] Calm Corner card saves check-in and provides recommendation.
- [x] My Progress card loads learner progress dashboard.
- [x] Community card launches topic-to-learn handoff.
- [x] Settings card loads and saves learner preferences.

## API Contract Checks

- [x] `POST /api/sessions` handles missing student relation for student role.
- [x] `GET /api/student/settings` returns normalized settings payload.
- [x] `PATCH /api/student/settings` persists updates and writes audit log.
- [x] `POST /api/regulate/check-in` validates payload and writes audit log.

## Manual Smoke Steps (Recommended in staging)

1. Sign in as a student user with no existing `student` row and click `Learn -> Begin Session`.
2. Visit `Settings`, change pace and accessibility flags, save, refresh, and verify persistence.
3. Visit `Calm Corner`, submit low mood/energy check-in, confirm recommendation and return path to `Learn`.
4. Visit `Community`, select a topic, and verify navigation to `/learn?topic=<id>` with topic context visible.
5. Use `Financial Literacy` card and verify subject is preselected before starting a session.

## Open QA Risks

- Playwright authenticated cross-card journey has not been re-recorded in this pass.
- Large-tenant performance for new community topic listing (currently top 8 topics) has not been load-profiled.
