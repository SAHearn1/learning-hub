# A-02 Threat Model and Data Flow Diagrams

- **Status:** In Progress (initial baseline published)
- **Date:** 2026-02-12
- **Implementer:** Architecture
- **Verifier:** Security
- **Related tasks:** A-02, SEC-01, SEC-02, O-01, AI-01

## Scope

This baseline covers:
- Student data handling
- AI prompt/response flow
- Third-party integrations (auth, billing, AI)
- Trust boundaries
- Initial mitigation mapping to OWASP ASVS

## Data Classification (high-level)

- **Sensitive PII:** student profile fields, guardian/parent identifiers, school/tenant associations
- **Sensitive educational records:** assessments, progress, learning history, accommodations
- **Operational sensitive data:** audit events, billing metadata, auth/session artifacts
- **High-risk AI data:** prompts/responses that may contain inferred personal or academic information

## Trust Boundaries

1. **Boundary TB-1:** User devices <-> Application edge (public network)
2. **Boundary TB-2:** Application services <-> Data services
3. **Boundary TB-3:** Application services <-> External third-party APIs
4. **Boundary TB-4:** CI/CD and secret management plane <-> Runtime

## DFD (Level 0)

```text
[Student/Teacher/Admin]
        |
        | HTTPS
        v
+--------------------------+
| Web/App (Vercel Runtime) |
+--------------------------+
   |       |        |      \
   |       |        |       \ HTTPS/API
   |       |        |        +--> [AI Provider]
   |       |        +-----------> [Billing Provider]
   |       +--------------------> [Auth Provider]
   +----------------------------> [DB + Storage]
                 |
                 +--------------> [Logging/Monitoring]
```

## DFD (Level 1 — Tutoring + Assessment)

```text
[User] -> [UI] -> [API Gateway/Route Handler] -> [AuthN/AuthZ Check]
                                         |              |
                                         | pass         | fail
                                         v              v
                                 [Session Service]   [403/401]
                                         |
                                         +--> [Prompt Safety Filter]
                                                  |
                                                  v
                                             [AI Provider]
                                                  |
                                                  v
                                         [Response Safety Filter]
                                                  |
                                                  v
                                         [Persistence Layer]
                                                  |
                                                  +--> [Audit Log]
                                                  +--> [Progress/Assessment]
```

## Key Threats and Mitigations

| Threat ID | Threat | Affected Flow | Mitigation |
|---|---|---|---|
| T-01 | Cross-tenant data access | API -> DB | Enforce tenant-scoped RBAC on all sensitive endpoints; negative tests for unauthorized tenant access. |
| T-02 | Prompt injection / policy bypass | UI/API -> AI provider | Input normalization, safety policy layer, adversarial test suite, blocklist/allowlist controls. |
| T-03 | PII leakage in logs/AI outputs | API/logging/AI output | PII redaction, structured logging with field-level suppression, response moderation. |
| T-04 | Secret compromise | CI/runtime/provider credentials | Secret manager migration, secret scanning in CI, rotation playbook, webhook invalidation. |
| T-05 | Replay/tampering on webhooks | Billing/Auth webhooks | Signature verification, idempotency keys/event IDs, timestamp windows, replay rejection. |
| T-06 | Supply-chain dependency risk | Build/release pipeline | SAST/dependency scans, SBOM, provenance attestations (SLSA-oriented). |
| T-07 | Availability degradation under load | Tutoring and dashboard APIs | SLO alerts, burn-rate alerting, rate limiting, performance budgets and gates. |

## OWASP ASVS Mapping (Initial)

| ASVS Area | Control Objective (summary) | Applied Mitigation | Owner Task |
|---|---|---|---|
| V1 Architecture | Security architecture and trust boundaries are documented | ADR + trust boundaries + DFD maintained in repo | A-01, A-02 |
| V2 Authentication | Strong auth for protected resources | Central auth checks on sensitive routes | SEC-01 |
| V4 Access Control | Enforce least privilege and tenant isolation | RBAC, role checks, negative tests, privilege matrix | SEC-01, S-03 |
| V5 Validation/Sanitization | Validate hostile/untrusted input | Schema validation and input guards on API/prompt paths | SEC-01, AI-02 |
| V7 Error/Logging | Prevent sensitive leakage in logs/errors | PII redaction and structured logging | O-02 |
| V8 Data Protection | Protect data at rest/in transit and lifecycle controls | Retention/deletion jobs and secure storage controls | P-01 |
| V9 Communications | Protect external/internal communications | HTTPS/TLS + signed webhook validation | C-02, SEC-01 |
| V10 Malicious Code | Dependency and code scanning | SAST + dependency + secret scans | C-02 |
| V14 Config | Secure config and secret handling | Secret manager + CI enforcement policy | S-02 |

> Note: control IDs will be expanded into a line-by-line ASVS matrix during SEC-02.

## Verification Checklist

- [ ] DFD validated against live API surface
- [ ] Threat list reviewed by Security verifier
- [ ] ASVS mapping linked to SEC-02 matrix
- [ ] Mitigations linked to test evidence

