# Compliance Posture

This document describes the regulatory compliance controls implemented in the RootWork Learning Hub. The platform handles education records for K-12 students, including minors and students with disabilities, and must comply with FERPA, COPPA, and IDEA.

## FERPA -- Family Educational Rights and Privacy Act

### Student Data Protection

All student learning records, assessment data, session transcripts, and progress reports are classified as education records under FERPA. Access controls enforce the following:

- **Role-based access** -- Only users with `EDUCATOR`, `SCHOOL_ADMIN`, `DISTRICT_ADMIN`, or `PLATFORM_ADMIN` roles can view student records, and only within their tenant scope.
- **Tenant isolation** -- Every Prisma query includes `tenantId` in its `where` clause. Cross-tenant data access is architecturally prevented.
- **Authenticated access** -- All API routes serving student data call `requireUser()` and verify the caller's role before returning results.
- **Audit logging** -- Read and write operations on sensitive records are logged via `appendImmutableAuditLog()` with SHA-256 hash chaining for tamper evidence.

### Directory Information

The platform does not disclose student directory information to third parties. School-specific directory information policies and opt-out flags are respected through the tenant settings configuration.

### Parent and Eligible Student Rights

Parents and eligible students can:

- Request inspection of their education records through the parent dashboard.
- Request amendment of inaccurate records by contacting their school administrator.
- Receive an accounting of disclosures where required by contract or law.

Requests are acknowledged within 5 business days and fulfilled per the applicable school or district agreement.

## COPPA -- Children's Online Privacy Protection Act

### Parental Consent

COPPA applies to all users under 13. The platform enforces consent gating as follows:

- **Consent-gated routes** -- All student learning routes (chat, sessions, assessments, pretests, IRT, exploration) check for active parental consent before processing. Routes return HTTP 403 with a `CONSENT_REQUIRED` code if consent is missing or revoked.
- **Consent lifecycle** -- The consent API (`src/app/api/compliance/consent/route.ts`) manages consent states (pending, granted, revoked) with role checks and transition validation. Every state change is audit-logged.
- **School authorization** -- For school-directed use, the platform relies on school or district authorization where legally permissible and contractually documented.

### Data Minimization

- The platform collects only data necessary for educational functionality.
- No behavioral advertising or tracking is applied to student users.
- Student PII is never included in AI model prompts. The guardrails engine strips PII from input before prompt assembly.

### Parent Rights

Parents can review their child's data through the parent dashboard, revoke consent (which immediately blocks the child's access to learning routes), and request deletion subject to legal retention obligations.

### Consent Record Retention

Consent records are retained for 7 years from the consent action date, consistent with COPPA requirements. After 7 years, records are archived to encrypted cold storage. Retention enforcement runs automatically via `src/lib/compliance/data-retention.ts`.

## IDEA -- Individuals with Disabilities Education Act

### IEP Accommodations

The platform supports IEP (Individualized Education Program) accommodations as first-class data:

- **Accommodation model** -- Active IEP accommodations are stored per student and loaded into the user's auth context via `getCurrentUser()`.
- **AI prompt integration** -- Active accommodations are included in the guardrail context and AI prompt assembly so that tutoring responses respect documented needs (e.g., simplified language, extended response time, visual scaffolding).
- **IEP safety guardrail** -- The `validateIepSafety()` post-generation check verifies that AI output does not contradict or undermine a student's active accommodations.

### Progress Monitoring

- Student progress is tracked per session, per assessment, and per 5R phase.
- Educators can view progress reports filtered by student, class, and time period.
- Progress data is available to parents through the parent dashboard, scoped to their linked children.

### Educator Authority

Educators retain full authority over IEP-related decisions. The AI system generates suggestions (accommodation recommendations, progress notes), but these are routed through the HITL review workflow and require explicit educator approval before becoming part of the student record.

## Data Retention Policy

| Data Category | Retention Period | Action |
|---------------|-----------------|--------|
| Session transcripts | 24 months after last activity | Soft delete, then hard delete after 30-day grace period |
| Assessment outcomes | 36 months after school year close | Anonymize (remove student identifier, retain aggregate data) |
| Consent records | 7 years from consent action | Archive to encrypted cold storage |
| Audit logs | 13 months rolling | Archive to cold storage |
| Soft-deleted data | 30-day grace period | Permanent deletion |

Retention enforcement runs daily at 2 AM via the automated job in `src/lib/compliance/data-retention.ts`. Every retention action is audit-logged.

## Breach Notification

In the event of unauthorized access, disclosure, or exfiltration of student data:

1. The security team is notified immediately via the incident response playbook (`docs/incident-response-playbook.md`).
2. The scope and impact of the breach are assessed within 24 hours.
3. Affected school districts and families are notified per contractual timelines and applicable state breach notification laws.
4. A post-incident report is produced and shared with affected parties, including remediation steps.
5. The incident is recorded in the audit log and the security incidents register.

## Governance

- **Compliance Owner** -- Defines policy and legal alignment.
- **Security Owner** -- Implements technical safeguards and incident handling.
- **Engineering Owner** -- Delivers compliant product behavior and evidence.
- **Review cadence** -- Quarterly, or upon major legal, product, or regulatory changes.

This document is an operational baseline. Legal counsel reviews and approves final regulatory interpretations, contracts, and external notices.
