# Operations Runbook

**Version:** 1.0.0
**Date:** 2026-02-28
**Audience:** On-call engineers, DevOps

This runbook covers routine operations, troubleshooting, and emergency procedures for the RootWork Learning Hub production environment.

---

## Quick Reference

| System | URL / Location | Access |
|--------|---------------|--------|
| Vercel dashboard | vercel.com/rootwork-team | Vercel team membership |
| Clerk dashboard | dashboard.clerk.com | Clerk org membership |
| Stripe dashboard | dashboard.stripe.com | Stripe account |
| Pinecone console | app.pinecone.io | Pinecone project |
| Datadog | app.datadoghq.com | Datadog org |
| GitHub Actions | github.com/SAHearn1/learning-hub/actions | Repo access |
| Production metrics | `/api/metrics` | PLATFORM_ADMIN role |
| Health check | `/api/health` | Public |

---

## 1. Health Monitoring

### 1.1 Health Check Endpoint

```bash
curl https://<production-url>/api/health
# Expected: { "status": "ok" }
# HTTP 200 = healthy
# HTTP 5xx = degraded — escalate immediately
```

### 1.2 Metrics Dashboard

```bash
# Prometheus format (for Datadog/Grafana scraping)
curl -H "Authorization: Bearer <admin-token>" https://<production-url>/api/metrics

# JSON format (for programmatic inspection)
curl -H "Authorization: Bearer <admin-token>" "https://<production-url>/api/metrics?format=json"
```

Key metrics to monitor:

| Metric | Normal range | Alert threshold |
|--------|-------------|----------------|
| `httpErrorRate` | < 0.5% | > 5% (CRITICAL) |
| `httpP95Duration` | < 300ms | > 1,000ms (ERROR) |
| `httpP99Duration` | < 600ms | > 2,000ms (WARNING) |
| `aiErrorRate` | < 1% | > 3% (ERROR) |
| `aiCostPerHour` | < $10 | > $50 (WARNING) |
| `cacheMissRate` | < 15% | > 30% (WARNING) |
| `concurrentUsers` | < 80 | > 90 (WARNING) |

### 1.3 Alert Channels

Alerts are dispatched via:
- **Slack** (`#alerts-production`): All P1/P2 alerts
- **PagerDuty**: P0 critical alerts (service down, DB errors)
- **Email**: Compliance-related alerts

---

## 2. Deployment Operations

### 2.1 Standard Deployment

Deployments are automated via GitHub Actions on merge to `main`.

```
1. Merge PR to main
2. CI runs (lint → build → test) [~5 min]
3. deploy.yml triggers vercel --prod [~3 min]
4. Health check smoke test runs [~60 sec]
5. Monitor Datadog for 30 min post-deploy
```

### 2.2 Manual Rollback

```bash
# Via Vercel CLI
vercel rollback --yes

# Via Vercel dashboard
# Deployments tab → select last green deployment → Redeploy
```

### 2.3 Production Database Migration

**Only required when Prisma schema changes are included in a release.**

1. Go to GitHub Actions → `Production DB Migration` workflow
2. Click `Run workflow` → select `main` branch
3. Confirm `PRODUCTION_DATABASE_URL` secret is set in the `production` environment
4. Monitor job output for `Migration applied successfully`
5. Verify health check after migration

### 2.4 Hotfix Deployment

For P0 incidents requiring an immediate code fix:

```bash
# 1. Create hotfix branch from main
git checkout main && git pull
git checkout -b hotfix/<short-description>

# 2. Make minimal fix
# 3. Run tests locally
# 4. Open emergency PR with 'hotfix' label
# 5. Obtain single reviewer approval (expedited review SLA: 30 min)
# 6. Merge → automatic deployment triggers
```

---

## 3. Database Operations

### 3.1 Connection Monitoring

Check current DB connection count via Prisma metrics:
```bash
curl -H "Authorization: Bearer <admin-token>" "https://<production-url>/api/metrics?format=json" | jq '.databaseQueryCount'
```

If DB error rate spikes:
1. Check Vercel function logs for `P1001` (connection refused) or `P2024` (pool timeout)
2. Check DB provider status page
3. If pool exhaustion: scale DB connection pool in provider dashboard
4. If DB host unreachable: failover to read replica if available

### 3.2 Data Retention Job

The retention cron runs daily at 02:00 UTC. To trigger manually:

```bash
curl -X POST https://<production-url>/api/cron/data-retention \
  -H "Authorization: Bearer ${CRON_SECRET}"
# Expected: { "success": true, "deletedSessions": N, ... }
```

If the cron fails:
1. Check Vercel cron logs in the dashboard
2. Verify `CRON_SECRET` is set correctly
3. Check `AuditLog` for `DATA_RETENTION_RUN` events
4. Run manually if automated execution is delayed > 24h

### 3.3 Backup Verification

```bash
# Verify latest backup exists (adjust for DB provider)
# PostgreSQL on Supabase/Neon: use dashboard → Backups
# Target: backup within last 6 hours
```

---

## 4. Curriculum Ingestion

### 4.1 Scheduled Ingestion

Curriculum ingestion runs daily at 02:00 UTC via `trigger-ingest.yml` workflow. It calls the N8N webhook which triggers `POST /api/ingest`.

### 4.2 Manual Ingestion Trigger

```bash
# Via GitHub Actions
GitHub Actions → trigger-ingest.yml → Run workflow

# Via direct API call (requires N8N_WEBHOOK_SECRET)
curl -X POST https://<production-url>/api/ingest \
  -H "Authorization: Bearer ${N8N_WEBHOOK_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"source": "MANUAL"}'
```

### 4.3 Idempotency Check

The ingest route computes a SHA-256 hash of the file payload. Repeat calls with identical content return:
```json
{ "success": true, "skipped": true, "reason": "identical_payload" }
```

This is expected behaviour — not an error.

### 4.4 Ingestion Failure

If ingestion fails:
1. Check `IngestLog` table for the failed record and `errorMessage`
2. Common causes:
   - `PINECONE_API_KEY` expired → rotate in Vercel env vars
   - `OPENAI_API_KEY` quota exceeded → check OpenAI dashboard
   - File parse error → check content of curriculum files
3. Re-trigger manually after fixing root cause

---

## 5. Rate Limiting

### 5.1 Current Configuration

| Layer | Limit | Window | Store |
|-------|-------|--------|-------|
| IP per path | 120 req/min (configurable) | 1 min | In-memory |
| Per user (tenant) | 200 req/min (configurable) | 1 min | In-memory |
| Chat endpoint | 30 req/60s | 60 sec | Redis |

### 5.2 Adjusting Limits

Rate limits are configurable via environment variables:
```bash
# In Vercel environment variables:
API_RATE_LIMIT_PER_MINUTE=150      # IP-based limit
TENANT_RATE_LIMIT_PER_MINUTE=250   # Per-user limit
```

### 5.3 Responding to Rate Limit Abuse

If a specific IP or user is abusing the API:
1. Check Vercel logs for the IP/user causing 429 storms
2. Block at Vercel Edge level if IP-based abuse
3. Suspend tenant in admin dashboard if authenticated user abuse
4. Consider reducing `API_RATE_LIMIT_PER_MINUTE` temporarily

---

## 6. Secret Rotation

### 6.1 Clerk Keys

When rotating Clerk keys (required on suspected compromise):
1. Generate new secret key in Clerk dashboard → API Keys
2. Update `CLERK_SECRET_KEY` in Vercel Production environment variables
3. Update `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` if rotating publishable key
4. Trigger new production deployment to pick up rotated keys
5. Verify auth flows in staging before production cut-over
6. Revoke old key in Clerk dashboard after successful deployment

### 6.2 Stripe Keys

1. Generate new restricted key in Stripe dashboard → Developers → API keys
2. Update `STRIPE_SECRET_KEY` in Vercel Production
3. Update `STRIPE_WEBHOOK_SECRET` if webhook signing secret is also rotated
4. Deploy and verify checkout and webhook flows

### 6.3 Database URL

1. Rotate DB credentials in DB provider dashboard
2. Update `DATABASE_URL` and `DIRECT_URL` in Vercel Production
3. Test connection before deploying

### 6.4 Pinecone API Key

1. Rotate in Pinecone console → API Keys
2. Update `PINECONE_API_KEY` in Vercel Production
3. Deploy and verify a chat session (tests RAG retrieval)

---

## 7. Incident Response

See `docs/incident-response-playbook.md` for full procedures.

### Quick Severity Classification

| Severity | Criteria | Response time |
|----------|---------|--------------|
| SEV-1 (CRITICAL) | Service down, data breach, auth failure | Immediate — 15 min |
| SEV-2 (HIGH) | Partial outage, elevated error rate > 5%, data leak possibility | 30 min |
| SEV-3 (MEDIUM) | Degraded performance, single feature broken, non-critical alerts | 2 hours |
| SEV-4 (LOW) | Cosmetic issues, isolated errors, minor UX degradation | Next business day |

### Immediate Actions on SEV-1

```
1. Post in #incidents: "[SEV-1] <brief description> <timestamp>"
2. Page on-call via PagerDuty
3. Freeze all production deployments (close deploy.yml triggers)
4. Preserve evidence: capture Vercel logs, DB query logs, Datadog traces
5. Identify blast radius (which tenants/users are affected?)
6. Contain: disable affected feature via PlatformConfig if possible
7. Fix or rollback
8. Notify affected tenants if data is involved (FERPA breach notification: 72h)
```

---

## 8. Compliance Operations

### 8.1 Data Rights Request (GDPR/FERPA)

When a data subject submits a deletion or export request:
1. Log request in `DataRightsRequest` table via `POST /api/compliance/data-rights`
2. Process within 30 days (GDPR) or as required by FERPA/state law
3. For deletion: run retention job targeting the specific user
4. For export: use admin export endpoint `GET /api/educator/reports` filtered by userId
5. Record completion in audit log

### 8.2 COPPA Consent Audit

Monthly review:
```bash
# Check consent denial rate
curl -H "Authorization: Bearer <admin-token>" "https://<production-url>/api/metrics?format=json" | jq '.consentDenialRate'
# Alert if > 20% for sustained period (could indicate UX friction or legal change)
```

### 8.3 Audit Log Export

For compliance audits or legal holds:
```bash
# Export audit logs for a date range via admin API
# (Implementation: add to admin export endpoint or direct DB query with PLATFORM_ADMIN credentials)
```

---

## 9. Vercel Environment Variable Reference

See `docs/HUMAN_ACTIONS_REQUIRED.md` for the full provisioning checklist.

| Variable | Scope | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Production | Pooled connection string |
| `DIRECT_URL` | Production | Direct connection for migrations |
| `CLERK_SECRET_KEY` | Production | Must be `sk_live_*` in production |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production | Must be `pk_live_*` in production |
| `STRIPE_SECRET_KEY` | Production | Live key (`sk_live_*`) |
| `STRIPE_WEBHOOK_SECRET` | Production | From Stripe dashboard webhook config |
| `ANTHROPIC_API_KEY` | Production | Claude API access |
| `PINECONE_API_KEY` | Production | Vector store access |
| `PINECONE_INDEX` | Production | Default: `rootwork-curriculum` |
| `REDIS_URL` | Production | For distributed rate limiting + cache |
| `N8N_WEBHOOK_SECRET` | Production | Curriculum ingest auth |
| `CRON_SECRET` | Production | Data retention cron auth |
| `DATADOG_STATSD_HOST` | Production | Metrics aggregation (optional but recommended) |
| `NEXT_PUBLIC_SENTRY_DSN` | Production | Error reporting (optional) |
