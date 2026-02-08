# Security & Privacy Incident Response Playbook

## Purpose
This playbook defines how Learning Hub responds to suspected or confirmed incidents involving student, family, or school data (FERPA/COPPA scope), plus billing security events.

## Severity levels
- **SEV-1 (Critical):** Confirmed unauthorized access/exfiltration of regulated data, active production compromise.
- **SEV-2 (High):** Strong indicators of unauthorized access with incomplete scope.
- **SEV-3 (Medium):** Contained issue with no evidence of external access.

## Activation criteria
Trigger this playbook when any of the following occurs:
- suspicious audit log patterns (permission escalation, mass export, unusual consent updates)
- alert on elevated API 5xx, auth anomalies, or repeated rate-limit abuse
- suspicious Stripe webhook/account lifecycle activity
- third-party disclosure of leaked data

## Roles
- **Incident Commander (IC):** Coordinates timeline, decisions, and stakeholder comms.
- **Security Lead:** Technical triage, containment, forensics.
- **Privacy/Compliance Lead:** FERPA/COPPA legal workflow, family/school notification planning.
- **Engineering Lead:** Executes remediation safely.
- **Support Lead:** External communication queue and templated responses.

## Response timeline
### 0–15 minutes (Triage)
1. Open incident channel and assign IC.
2. Capture ticket with UTC timestamps.
3. Classify initial severity and affected systems.
4. Freeze non-essential production deploys.

### 15–60 minutes (Containment)
1. Revoke compromised credentials/tokens.
2. Disable high-risk features if needed (chat/session creation, exports, billing mutations).
3. Increase logging and preserve forensics artifacts.
4. Start impacted-tenant identification.

### 1–4 hours (Investigation)
1. Confirm attack vector and blast radius.
2. Correlate request IDs, audit logs, and billing/user lifecycle records.
3. Document affected data categories (PII, transcripts, assessment data, billing identifiers).
4. Draft regulator/contractual notification decisions with privacy counsel.

### 4–24 hours (Recovery)
1. Patch vulnerability and validate with focused tests.
2. Rotate secrets and verify webhook signing.
3. Re-enable paused features behind monitored gates.
4. Send stakeholder updates per contractual timelines.

### 1–5 days (Post-incident)
1. Publish incident report with root cause + corrective actions.
2. Attach evidence package to audit folder.
3. Track follow-up controls to completion with owners/dates.

## Evidence to preserve
- Request IDs, API logs, and monitoring snapshots.
- Relevant `AuditLog` records and consent/data-rights events.
- Stripe webhook delivery + account lifecycle events.
- Timeline of mitigation actions and approver identities.

## Escalation & notification guardrails
- Notify affected schools/families when legal/contractual thresholds are met.
- Ensure communication excludes unnecessary student-level details.
- Keep a written decision log for whether notification is required.
