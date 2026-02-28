# Enterprise Compliance Packet

**Version:** 1.0.0
**Last updated:** 2026-02-28
**Owner:** Operations Agent
**Classification:** Confidential — for enterprise procurement and legal review

---

## Overview

This packet provides structured evidence that the RootWork Learning Hub meets the
compliance requirements for enterprise K-12 SaaS procurement. It is intended for:

- School district security officers conducting vendor assessments
- Legal counsel reviewing data processing agreements
- Compliance auditors verifying regulatory adherence
- IT administrators evaluating deployment requirements

---

## Contents

| Document | Description |
|---|---|
| `README.md` | This index — packet overview and scope |
| `subprocessors.md` | List of all third-party sub-processors and their data roles |
| `data-flows.md` | Diagrams and descriptions of all student data flows |
| `retention-enforcement.md` | Data retention policies, enforcement evidence, and deletion procedures |
| `incident-response.md` | Incident classification, response procedures, and notification timelines |

**Additional compliance evidence in the main `docs/` directory:**

| Document | Location |
|---|---|
| Full compliance posture | `docs/COMPLIANCE.md` |
| AI governance framework | `docs/AI_GOVERNANCE.md` |
| Staff training guide | `docs/STAFF_TRAINING.md` |
| Disaster recovery plan | `docs/DISASTER_RECOVERY.md` |
| RLS auditing report | `docs/RLS_AUDITING_REPORT.md` |
| Security audit | `docs/SECURITY_AUDIT.md` |
| Incident history | `docs/SECURITY_INCIDENTS.md` |

---

## Regulatory Framework

| Regulation | Applicability | Status |
|---|---|---|
| **FERPA** (20 U.S.C. § 1232g) | All student education records | Implemented — see `data-flows.md` |
| **COPPA** (15 U.S.C. § 6501) | Users under 13 | Implemented — consent gating active |
| **IDEA** (20 U.S.C. § 1400) | Students with disabilities | Implemented — IEP accommodation model |
| **GDPR** (EU 2016/679) | EU/EEA students if applicable | Partial — data rights API implemented; DPA available on request |
| **CCPA** (Cal. Civil Code § 1798.100) | California residents | Data rights request endpoint implemented |

---

## Data Processor Agreements

Districts deploying Learning Hub must execute:

1. **Data Processing Agreement (DPA)** — governs Anthropic's sub-processing of
   student data through the Claude API.
2. **School Service Provider Agreement** — executed with RootWork Foundation.
3. **Vendor Assessment Questionnaire** — completed by RootWork Foundation on request.

Contact: legal@rwfw.org for DPA and vendor assessment materials.

---

## Security Certifications (Planned)

| Certification | Status | Target date |
|---|---|---|
| SOC 2 Type II | In planning | Q3 2026 |
| COPPA Safe Harbor (kidSAFE) | In planning | Q4 2026 |
| Student Privacy Pledge | Under review | Q2 2026 |

---

## Annual Review Schedule

This packet is reviewed and updated annually (or after any material system change):

| Review | Date | Reviewer |
|---|---|---|
| Initial creation | 2026-02-28 | Operations Agent |
| Next scheduled review | 2027-02-28 | — |
