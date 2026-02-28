# Data Retention Enforcement

**Version:** 1.0.0
**Last updated:** 2026-02-28
**Owner:** Operations Agent

---

## Overview

This document describes Learning Hub's data retention policies, automated enforcement
mechanisms, deletion procedures, and evidence generation for compliance audits.

---

## 1. Retention Policies

| Data category | Retention period | Legal basis | Enforcement |
|---|---|---|---|
| Student education records (FERPA) | 7 years post-enrolment | FERPA § 99.67 | Automated nightly cron |
| Session transcripts | 7 years | FERPA / COPPA | Automated nightly cron |
| Assessment results | 7 years | FERPA | Automated nightly cron |
| Parental consent records | 7 years from consent action | COPPA § 312.6 | Automated nightly cron |
| Audit logs | 7 years (immutable; archived) | FERPA / IDEA | Archive, not delete |
| Ingest logs | 7 years | Internal policy | Automated nightly cron |
| Billing records | 7 years | Tax / accounting law | Stripe-managed |
| Security incident records | 10 years | Best practice | Manual archive |
| IEP accommodation data | Duration of enrolment + 5 years | IDEA | Automated |
| AI generation logs (HITL) | 3 years | Internal AI governance | Automated |

---

## 2. Automated Enforcement

### 2.1 Cron Schedule

```
Vercel Cron: nightly at 02:00 UTC
Endpoint: POST /api/cron/data-retention
Authorization: Vercel Cron header (CRON_SECRET)
```

Configuration in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/data-retention",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### 2.2 Retention Run Output

Every cron execution produces a structured log entry:

```typescript
{
  run_id: string,           // UUID, unique per execution
  started_at: string,       // ISO 8601
  completed_at: string,
  records_scanned: number,
  records_deleted: number,
  records_anonymised: number,
  errors: string[],
  success: boolean
}
```

Logs are stored in:
- Application logs (Vercel → Sentry for errors)
- `IngestLog` table (retention_run category)

### 2.3 Deletion vs. Anonymisation

| Scenario | Action |
|---|---|
| Record past retention period | Hard delete from Neon |
| Audit log past retention | Archive to cold storage (encrypted S3); not deleted from primary DB |
| Vector embeddings for deleted documents | Delete from Pinecone namespace |
| User account deletion (GDPR request) | Anonymise user record (replace name/email with `REDACTED_<hash>`); delete session transcripts |

---

## 3. Right-to-Erasure Procedure (GDPR/FERPA)

Triggered by: `POST /api/compliance/data-rights` with `{ type: "DELETE" }`

```
1. Admin receives request via /api/compliance/data-rights
2. Admin verifies requestor identity and authority
3. Admin approves deletion in admin dashboard
4. Automated deletion job runs:
   a. Anonymise User record (name → REDACTED; email → hash@redacted.local)
   b. Delete all Session, Message records for the user
   c. Delete all Assessment* records for the user
   d. Delete all Progress* records for the user
   e. Delete Pinecone vectors for tenant IEP namespace (if applicable)
   f. Write AuditLog entry: { action: "DATA_DELETION", requestorId, targetUserId, deletedAt }
5. Confirmation sent to requestor within 30 days (GDPR) / 45 days (FERPA)
```

**Evidence generated:** AuditLog entry with SHA-256 hash of deleted record IDs.

---

## 4. Compliance Evidence Export

### 4.1 Available Evidence

| Evidence type | Endpoint | Format |
|---|---|---|
| Retention run logs | `GET /api/admin/data-retention` | JSON |
| Audit log (read access) | `GET /api/admin/audit-log` | JSON (paginated) |
| Consent history for a student | `GET /api/parent/consent/history` | JSON |
| Data rights requests | `GET /api/compliance/data-rights` | JSON |

### 4.2 Evidence Package for Audit

To generate a compliance evidence package for a district audit:

```bash
# Export all retention run logs for the past year
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/api/admin/data-retention?since=2025-01-01" \
  | jq '.' > retention-runs-2025.json

# Export audit log for a specific tenant
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_BASE/api/admin/audit-log?tenantId=$TENANT_ID&since=2025-01-01" \
  | jq '.' > audit-log-tenant.json
```

---

## 5. Immutable Audit Trail

Audit logs use SHA-256 hash chaining to detect tampering:

```typescript
// Each AuditLog record stores:
{
  id:          string,   // UUID
  action:      string,   // e.g. "CONSENT_GRANTED"
  actorId:     string,   // User who performed action
  targetId:    string,   // Affected record ID
  tenantId:    string,
  metadata:    JSON,
  previousHash: string,  // Hash of previous AuditLog record
  hash:        string,   // SHA-256(id + action + actorId + targetId + previousHash)
  createdAt:   DateTime
}
```

Tampering with any record invalidates all subsequent hashes.
Chain integrity can be verified with `scripts/validate-compliance.mjs`.

---

## 6. Backup and Disaster Recovery

| Parameter | Value |
|---|---|
| Neon backup frequency | Continuous (point-in-time recovery) |
| Backup retention | 30 days |
| RTO (Recovery Time Objective) | < 4 hours |
| RPO (Recovery Point Objective) | < 15 minutes |
| Backup encryption | AES-256 at rest, TLS in transit |

See `docs/DISASTER_RECOVERY.md` for full DR runbook.

---

## 7. Verification and Testing

Retention enforcement is verified:

1. **Unit tests:** `src/lib/compliance/__tests__/data-retention.test.ts`
2. **Integration tests:** Retention cron endpoint tested in `tests/integration/api/`
3. **Manual verification:** Quarterly review of retention run logs by Operations team
4. **Annual audit:** Full evidence export reviewed by legal counsel

---

## Changelog

| Date | Change |
|---|---|
| 2026-02-28 | Initial creation |
