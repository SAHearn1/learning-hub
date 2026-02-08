# COMPLIANCE.md

## Purpose
This document defines baseline compliance requirements for handling student and family data in the Learning Hub platform, with a focus on:

- **FERPA** (Family Educational Rights and Privacy Act)
- **COPPA** (Children’s Online Privacy Protection Act)

It is a practical implementation guide for product, engineering, operations, and support teams.

---

## Scope
These requirements apply to:

- All production and non-production environments
- Internal tools and admin dashboards
- APIs, databases, logs, analytics, and backups
- Third-party processors and integrations that may access education records or child data

---

## FERPA Compliance Controls

### 1) Education Record Protection
- Treat student learning records, assessment data, and identifiable classroom information as **education records**.
- Restrict access using least privilege and role-based access controls (RBAC).
- Require authenticated access for all educator/admin views of student records.

### 2) Legitimate Educational Interest
- Access to student records is limited to authorized school personnel and approved processors with a legitimate educational interest.
- Any access outside that purpose requires documented authorization by the district/school.

### 3) Parent/Eligible Student Rights
Implement processes to support:
- Request to inspect/review student records
- Request to amend inaccurate records
- Disclosure accounting where required by policy/contract

Operational target:
- Acknowledge requests within **5 business days**
- Fulfill valid requests within timelines required by school/district agreement or applicable law

### 4) Directory Information and Consent
- Do not disclose non-directory information without required consent or legal basis.
- Honor school-specific directory information policies and opt-out flags.

### 5) Data Sharing and Vendors
- Execute appropriate data processing terms with subprocessors.
- Share only minimum necessary FERPA-covered data.
- Maintain a current subprocessors inventory available to customers upon request.

### 6) Security Safeguards
- Encrypt FERPA-covered data in transit (TLS 1.2+) and at rest.
- Log access to sensitive records and retain audit logs per retention policy.
- Implement periodic access reviews and rapid deprovisioning for offboarded users.

---

## COPPA Compliance Controls

### 1) Age and School Context
- COPPA obligations apply when collecting personal information from children under 13.
- For school-authorized use, rely on school/district authorization where legally permissible and contractually documented.

### 2) Notice Requirements
Provide clear, public notice describing:
- Categories of child data collected
- How data is used
- Third parties receiving data
- Parent rights and contact methods

### 3) Verifiable Consent (When Required)
- Obtain verifiable parental consent when required outside school-authorized contexts.
- Maintain consent records and consent source metadata.
- Block optional/non-essential child data collection until required consent is recorded.

### 4) Data Minimization
- Collect only data necessary for educational functionality.
- Disable behaviorally targeted advertising for child-directed or known-under-13 users.
- Prohibit sale of child personal information.

### 5) Parent Rights
Support parent requests to:
- Review child personal information
- Revoke consent (where consent is the legal basis)
- Request deletion, subject to legal/contractual retention obligations

### 6) Retention and Deletion
- Retain child data only as long as necessary for educational purpose or legal obligations.
- Define and execute deletion workflows for inactive accounts, expired school contracts, and parent/school requests.

---

## Shared Operational Requirements

### Data Classification
Classify data into:
- Public
- Internal
- Sensitive (FERPA/COPPA-regulated)

Sensitive data must receive stricter controls for access, storage, transmission, and logging.

### Access Management
- Enforce SSO/MFA for privileged roles where available.
- Use unique user IDs; no shared admin credentials.
- Rotate keys/secrets and store only in approved secret managers.

### Incident Response
- Maintain an incident response plan for unauthorized access, disclosure, or exfiltration.
- Escalate potential FERPA/COPPA incidents immediately to security and compliance owners.
- Coordinate school/customer notifications per contract and law.

### Training
- Provide annual FERPA/COPPA and secure data handling training for staff with data access.
- Document completion for audit readiness.

### Privacy by Design
- Include privacy review in new feature design (especially student profiles, AI features, analytics, and third-party integrations).
- Conduct DPIA-style reviews for higher-risk data flows.

---

## Engineering Implementation Checklist

- [ ] Authentication and RBAC enforced on all student data endpoints
- [ ] Audit logging enabled for read/write actions on sensitive records
- [ ] PII redaction rules applied to application logs and error telemetry
- [ ] Consent/authorization checks integrated into relevant API routes
- [ ] Data export and deletion mechanisms available for rights requests
- [ ] Encryption verified at rest and in transit
- [ ] Subprocessor inventory updated and reviewed
- [ ] Retention/deletion jobs scheduled and monitored
- [ ] Security testing performed before major releases

---

## Governance and Ownership
- **Compliance Owner:** Defines policy and legal alignment.
- **Security Owner:** Implements technical safeguards and incident handling.
- **Engineering Owner:** Delivers compliant product behavior and evidence.
- **Support/Operations:** Executes request workflows and customer communication.

Review cadence: **Quarterly** or upon major legal/product changes.

---

## Disclaimer
This document is an operational baseline and not legal advice. Legal counsel should review and approve final FERPA/COPPA interpretations, contracts, and external notices.
