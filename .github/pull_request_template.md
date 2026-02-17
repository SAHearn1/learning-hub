## Summary

<!-- 1-3 bullet points describing what this PR does -->

## Scope

<!-- Which module(s) are affected? (e.g., LMS Core, 5R Module, AI Governance, Security) -->

## Risk Assessment

- [ ] **Low** — Additive changes, no breaking modifications
- [ ] **Medium** — Schema changes, API contract modifications, or auth flow updates
- [ ] **High** — Data migration, history rewrite, or production deployment changes

## Test Plan

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Build passes (`npm run build`)
- [ ] Lint passes (`npm run lint`)

## Rollback Plan

<!-- How to revert if something goes wrong? -->

## Checklist

- [ ] No secrets or PII in code or logs
- [ ] RBAC enforced server-side on new endpoints
- [ ] Tenant isolation maintained (tenantId on all queries)
- [ ] Audit logging added for sensitive mutations
- [ ] Accessibility basics (labels, focus, headings) on new UI
- [ ] CLAUDE.md / PROGRAM_BOARD.md updated if applicable
