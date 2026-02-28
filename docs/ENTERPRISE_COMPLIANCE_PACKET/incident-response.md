# Incident Response

**Version:** 1.0.0
**Last updated:** 2026-02-28
**Owner:** Operations Agent
**Related:** `docs/incident-response-playbook.md`

---

## Overview

This document describes how Learning Hub classifies, responds to, and communicates
security and privacy incidents. It is structured for enterprise procurement review
and satisfies FERPA breach notification requirements under 34 CFR Part 99.

---

## 1. Incident Classification

| Severity | Definition | Examples |
|---|---|---|
| **P0 — Critical** | Active data breach or service outage affecting student PII | Cross-tenant data leak, auth bypass, ransomware, total platform outage |
| **P1 — High** | Potential data exposure or significant availability impact | Unauthorized admin access, AI guardrail bypass, >30min downtime |
| **P2 — Medium** | Security vulnerability without confirmed exploitation | Dependency CVE, misconfigured permission, degraded performance |
| **P3 — Low** | Minor security or reliability issue | UI bug, non-PII data inconsistency, slow response |

---

## 2. Response Timeline

### P0 — Critical

| Timeframe | Action |
|---|---|
| 0–15 min | On-call engineer notified via PagerDuty / Sentry alert |
| 0–30 min | Incident commander assigned; Slack war room opened |
| 0–1 hr | Blast radius assessed; affected tenants identified |
| 1–2 hr | Containment action taken (block endpoint / revoke credentials / isolate tenant) |
| 2–4 hr | Root cause under investigation; interim status update to affected districts |
| 4–24 hr | Root cause identified; fix deployed to production |
| 24–72 hr | Post-incident report drafted |
| 72 hr | Formal breach notification sent to affected districts (FERPA requirement: "without unreasonable delay"; NIST recommendation: 72 hours) |
| 30 days | Full incident report published internally; FERPA notification completed |

### P1 — High

| Timeframe | Action |
|---|---|
| 0–1 hr | Engineering lead notified |
| 1–4 hr | Triage and containment |
| 4–24 hr | Fix developed and deployed |
| 48 hr | Incident closed or escalated to P0 |

### P2/P3 — Medium/Low

Handled in normal sprint cycle. Tracked as GitHub issues with appropriate labels.

---

## 3. Breach Notification Obligations

### FERPA (34 CFR § 99.36)

If student education records are disclosed in violation of FERPA:

1. Learning Hub notifies the affected district within 72 hours of confirmation.
2. Notification includes:
   - Nature of the disclosure
   - Records affected (type and approximate count)
   - Students affected (if identifiable)
   - Actions taken to contain and remediate
   - Steps to prevent recurrence
3. Districts notify affected parents/eligible students within a reasonable time.

### COPPA (16 CFR § 312.10)

If COPPA violation is detected (e.g., collection of PII from child under 13 without
parental consent):

1. Notify FTC and affected parents within 72 hours.
2. Cease processing the child's data immediately.
3. Delete unlawfully collected data.

### State Laws

Some states (e.g., California, New York) require faster notification (48 hours or
less). Districts in these states receive prioritised notification.

---

## 4. Safe Mode Protocol

If any of the following are detected, the system enters **Safe Mode**:

| Trigger | Response |
|---|---|
| Cross-tenant data access confirmed | Block all API endpoints except `/api/health`; revoke all active sessions; open P0 incident |
| Auth regression detected | Disable new sign-ins; maintain read-only mode for active sessions |
| CSP weakening detected in production | Revert deployment; block PR; open P0 incident |
| AI retrieval returning another tenant's data | Disable `/api/chat`; audit Pinecone namespaces; open P0 incident |
| Compliance violation (FERPA/COPPA breach) | Halt merges; block deploys; immediate P0 incident + legal notification |

---

## 5. Contact Information

| Role | Contact |
|---|---|
| Security incidents | security@rwfw.org |
| Privacy officer | privacy@rwfw.org |
| Legal counsel | legal@rwfw.org |
| District emergency contact | Per district contract |

For active P0 incidents, contact security@rwfw.org with subject line:
`[P0 INCIDENT] <brief description>`

---

## 6. Evidence Preservation

During a P0 incident:

1. Export Vercel logs for the affected time window (up to 7 days retained).
2. Export Neon audit log (`SELECT * FROM "AuditLog" WHERE "createdAt" >= $1`).
3. Export Sentry error timeline.
4. Preserve all incident-related Slack/email communications.

Evidence is retained for 10 years per `docs/ENTERPRISE_COMPLIANCE_PACKET/retention-enforcement.md`.

---

## 7. Post-Incident Review

Every P0 and P1 incident requires a post-incident review document within 7 days:

- Timeline of events
- Root cause analysis (5 Whys)
- Impact assessment (tenants affected, records exposed)
- Containment and remediation actions
- Process improvements
- Preventive measures implemented

Reviews are stored in `docs/SECURITY_INCIDENTS.md` (anonymised for public record).

---

## Changelog

| Date | Change |
|---|---|
| 2026-02-28 | Initial creation |
