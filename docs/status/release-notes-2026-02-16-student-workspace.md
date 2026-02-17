# Release Notes - 2026-02-16

## Scope

Student workspace end-to-end operability hardening, with production build verification and workflow completion for all student cards.

## Highlights

- Fixed session start reliability for student users by auto-provisioning missing `student` records in `POST /api/sessions`.
- Added subject preselection handoff support for `Learn` route query parameters.
- Replaced placeholder `Settings` page with persisted student preferences workflow (`GET/PATCH /api/student/settings`).
- Replaced placeholder `Calm Corner` page with persisted regulation check-in workflow (`POST /api/regulate/check-in`).
- Replaced placeholder `Community` page with topic-based launchpad that routes learners directly into guided sessions (`/learn?topic=...`).
- Added explicit `Student Dashboard` link to role-based portal section.

## Card-by-Card Workflow Status

- `Learn`: Working end-to-end (setup -> begin session -> API persistence).
- `Explore`: Existing pretest/topic recommendation flow remains operational.
- `Financial Literacy` (learn): Subject preselection now honored in Learn setup.
- `Browse Curriculum`: Existing standards/topic browsing flow remains operational.
- `Financial Literacy` (curriculum): Existing curriculum subject filter remains operational.
- `Calm Corner`: Working end-to-end (check-in capture -> persisted audit event -> recommendation + return to learn).
- `My Progress`: Existing progress dashboard flow remains operational.
- `Community`: Working end-to-end (topic selection -> deep link to guided learn session).
- `Settings`: Working end-to-end (load settings -> edit -> persist -> audit log).

## Verification

- Targeted tests:
  - `cmd /c npx vitest run src/app/api/sessions/__tests__/route.test.ts src/app/api/student/settings/__tests__/route.test.ts src/app/api/regulate/check-in/__tests__/route.test.ts src/config/__tests__/config.test.ts`
  - Result: 4 files passed, 39 tests passed.
- Production build:
  - `cmd /c npm run build`
  - Result: passed.

## Notes

- Next.js warned about multiple lockfiles in the parent directory. This is informational and did not block build output.
