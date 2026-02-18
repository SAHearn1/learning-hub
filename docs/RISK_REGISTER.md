# Risk Register

This register is updated weekly and referenced by daily blocker digests.

| Risk ID | Description | Domain | Severity | Likelihood | Owner | Mitigation | Target Date | Status |
|---|---|---|---|---|---|---|---|---|
| RISK-001 | Historic secrets exposure in docs/repo could allow unauthorized access. | Secrets | Critical | Medium | Rafael Ortiz | Complete key rotation (S-01), invalidate webhooks, secret manager migration (S-02), enforce CI secret scanning. | 2026-02-19 | Open |
| RISK-002 | Architecture split across repositories may produce inconsistent controls and deployment drift. | Architecture | High | Medium | Maya Chen | Deliver ADR selecting `learning-hub` as primary repo and define RWFW-Tutoring-APP role (A-01); enforce single-repo decision in onboarding docs. | 2026-02-18 | Open |
| RISK-003 | COPPA compliance gaps in consent and parental rights workflows. | Privacy/COPPA | Critical | Medium | Jordan Lee | Data inventory/classification + consent/export/delete implementation and audit trail (P-01, P-02). | 2026-03-05 | Open |
| RISK-004 | FERPA control gaps around student record access and auditability. | Privacy/FERPA | Critical | Medium | Alex Kim | RBAC/tenant isolation, least privilege review, audit and negative tests (SEC-01, S-03). | 2026-03-01 | Open |
| RISK-005 | Accessibility issues on key flows may block equitable access and contractual acceptance. | Accessibility | High | Medium | Priya Singh | WCAG 2.2 AA audit and CI accessibility regression tests (Q-02). | 2026-03-03 | Open |
| RISK-006 | AI tutoring outputs may include hallucinations, bias, prompt injection or unsafe responses. | AI Safety | High | Medium | Omar Haddad | NIST AI RMF governance loop + runtime safety tests and moderation controls (AI-01, AI-02). | 2026-03-06 | Open |
| RISK-007 | Supply-chain vulnerabilities or tampered dependencies could compromise builds/releases. | Supply-chain | High | Medium | Nina Patel | SAST/dependency/secret scans, SBOM generation, provenance attestations (C-02, C-03, C-04). | 2026-03-08 | Open |
| RISK-008 | Missing SLO alerting and correlation may delay incident detection and response. | Reliability/SRE | High | Medium | Nina Patel | Define SLIs/SLOs, burn-rate alerts, request ID propagation, tracing with PII redaction (O-01, O-02). | 2026-03-02 | Open |
| RISK-009 | Backup/restore procedures may fail during outage, causing data loss beyond tolerance. | Disaster Recovery | High | Low | Victor Wang | Run backup and restore drills; publish DR runbook and game-day schedule (DR-01). | 2026-03-04 | Open |
