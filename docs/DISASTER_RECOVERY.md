# Disaster Recovery Plan

**Learning Hub - Production Environment**

## Overview

This document outlines the disaster recovery (DR) procedures for the Learning Hub platform, ensuring business continuity and COPPA compliance.

## Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)

| Service | RTO | RPO | Priority |
|---------|-----|-----|----------|
| **Database (PostgreSQL)** | 2 hours | 1 hour | CRITICAL |
| **Application (Next.js)** | 30 minutes | N/A (stateless) | CRITICAL |
| **File Storage** | 1 hour | 24 hours | HIGH |
| **Redis Cache** | 15 minutes | N/A (ephemeral) | MEDIUM |

## Backup Strategy

### Database Backups

**Automated Backups:**
- **Frequency:** Every 6 hours + continuous WAL archiving
- **Retention:**
  - Daily backups: 30 days
  - Weekly backups: 13 weeks (3 months)
  - Monthly backups: 7 years (COPPA compliance)
- **Encryption:** GPG encrypted at rest
- **Storage:** Local + S3 Standard-IA
- **Verification:** Automated integrity checks every 24 hours

**Manual Backups:**
```bash
# Create immediate backup
bash scripts/backup-database.sh

# Verify backup
bash scripts/backup-database.sh --verify
```

### Application Deployments

**Version Control:**
- All code in Git (GitHub)
- Tagged releases for production deployments
- Deployment history preserved for rollback

**Deployment Backups:**
- Pre-deployment snapshots
- Database migration backups
- Configuration backups

### Configuration & Secrets

**Backup Locations:**
- Environment variables: Encrypted in 1Password/Vault
- Clerk configuration: Documented in runbook
- Stripe webhooks: Documented configuration
- API keys: Secure key rotation schedule

## Disaster Scenarios & Response

### Scenario 1: Complete Database Loss

**Detection:**
- Health check failure
- Database connection errors
- Datadog alert: `database-connection-failure`

**Recovery Steps:**

1. **Assess Damage** (0-15 minutes)
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1;"

   # Review error logs
   tail -f /var/log/postgresql/postgresql.log
   ```

2. **Identify Latest Backup** (15-30 minutes)
   ```bash
   # List available backups
   ls -lh /var/backups/learninghub/

   # Check S3 backups
   aws s3 ls s3://learninghub-backups/database/ --recursive
   ```

3. **Restore Database** (30-90 minutes)
   ```bash
   # Download latest backup from S3
   aws s3 cp s3://learninghub-backups/database/latest.sql.gpg /tmp/

   # Restore database
   bash scripts/restore-database.sh /tmp/latest.sql.gpg
   ```

4. **Verify Restore** (90-105 minutes)
   ```bash
   # Run health checks
   curl https://learninghub.com/api/health

   # Verify critical data
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"User\";"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Session\";"

   # Check recent activity
   psql $DATABASE_URL -c "SELECT MAX(\"createdAt\") FROM \"AuditLog\";"
   ```

5. **Resume Services** (105-120 minutes)
   ```bash
   # Restart application
   vercel --prod

   # Monitor for errors
   tail -f logs/application.log
   ```

6. **Post-Recovery** (2-4 hours)
   - Notify stakeholders of service restoration
   - Create incident post-mortem
   - Update backup procedures if needed
   - Document lessons learned

**Expected Data Loss:** Maximum 1 hour (last backup to failure)

### Scenario 2: Application Deployment Failure

**Detection:**
- Health check failure after deployment
- High error rate (>5%)
- User reports

**Recovery Steps:**

1. **Immediate Rollback** (0-5 minutes)
   ```bash
   # Rollback to previous deployment
   vercel rollback --yes
   ```

2. **Verify Rollback** (5-10 minutes)
   ```bash
   # Check health
   curl https://learninghub.com/api/health

   # Monitor error rate
   curl https://learninghub.com/api/metrics?format=json | jq '.metrics.httpErrorRate'
   ```

3. **Root Cause Analysis** (10-30 minutes)
   - Review deployment logs
   - Check Sentry error reports
   - Identify failing component

4. **Fix & Redeploy** (30-60 minutes)
   - Fix identified issue
   - Test in staging
   - Deploy with caution

**Expected Downtime:** 5-15 minutes

### Scenario 3: Data Corruption

**Detection:**
- Audit log chain breaks
- Inconsistent data reports
- User complaints

**Recovery Steps:**

1. **Isolate Corruption** (0-30 minutes)
   ```sql
   -- Check audit log integrity
   SELECT id, "chainHash", "previousHash" FROM "AuditLog" ORDER BY "timestamp" DESC LIMIT 100;

   -- Identify corrupted records
   SELECT * FROM "Session" WHERE "deletedAt" IS NOT NULL AND "deletedAt" > NOW();
   ```

2. **Stop Write Operations** (30-45 minutes)
   ```bash
   # Enable maintenance mode
   export MAINTENANCE_MODE=true
   vercel --prod
   ```

3. **Restore from Point-in-Time** (45-90 minutes)
   ```bash
   # Restore to specific timestamp
   bash scripts/restore-database.sh --point-in-time "2026-02-09 10:00:00"
   ```

4. **Verify Data Integrity** (90-120 minutes)
   ```bash
   # Run data validation
   npm run validate:data

   # Check audit chain
   npm run validate:audit-chain
   ```

5. **Resume Operations** (120-180 minutes)
   ```bash
   # Disable maintenance mode
   export MAINTENANCE_MODE=false
   vercel --prod
   ```

### Scenario 4: Security Breach

**Detection:**
- Unusual access patterns
- Failed authentication attempts
- Data exfiltration alerts

**Recovery Steps:**

1. **Immediate Actions** (0-15 minutes)
   - Rotate all API keys and secrets
   - Enable IP allow-listing
   - Capture forensic evidence

2. **Assess Impact** (15-60 minutes)
   ```sql
   -- Check recent access
   SELECT * FROM "AuditLog" WHERE "timestamp" > NOW() - INTERVAL '24 hours' ORDER BY "timestamp" DESC;

   -- Identify affected users
   SELECT DISTINCT "userId" FROM "AuditLog" WHERE "ipAddress" = 'suspicious-ip';
   ```

3. **Contain Breach** (1-2 hours)
   - Disable compromised accounts
   - Force password reset for affected users
   - Update security rules

4. **Restore from Clean Backup** (2-4 hours)
   ```bash
   # Restore from backup before breach
   bash scripts/restore-database.sh backup_pre_breach.sql.gpg
   ```

5. **Notification** (4-72 hours)
   - Notify affected users (COPPA requirements)
   - Report to authorities if required
   - Update privacy policy if needed

## Backup Automation

### Cron Schedule

Add to `/etc/cron.d/learninghub-backups`:

```bash
# Database backups every 6 hours
0 */6 * * * /home/app/scripts/backup-database.sh >> /var/log/backups.log 2>&1

# Data retention enforcement daily at 2 AM
0 2 * * * /home/app/scripts/run-data-retention.ts >> /var/log/retention.log 2>&1

# Backup verification daily at 3 AM
0 3 * * * /home/app/scripts/verify-backups.sh >> /var/log/backup-verification.log 2>&1
```

### GitHub Actions (Optional)

```yaml
# .github/workflows/backup.yml
name: Scheduled Database Backup

on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Database Backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          S3_BUCKET: ${{ secrets.S3_BACKUP_BUCKET }}
          GPG_RECIPIENT: ${{ secrets.GPG_BACKUP_KEY }}
        run: bash scripts/backup-database.sh
```

## Testing & Validation

### Monthly DR Drills

**First Tuesday of every month:**

1. **Backup Restoration Test**
   ```bash
   # Restore to staging environment
   DATABASE_URL=$STAGING_DATABASE_URL bash scripts/restore-database.sh latest_backup.sql.gpg
   ```

2. **Application Rollback Test**
   ```bash
   # Deploy old version to staging
   vercel rollback --env=staging
   ```

3. **Incident Response Simulation**
   - Trigger test alert
   - Execute runbook
   - Document response time

**Success Criteria:**
- Backup restoration completes in <2 hours
- Application rollback completes in <5 minutes
- All team members can access runbooks
- Alerts reach on-call engineer

### Backup Verification

**Automated Daily Checks:**
```bash
#!/bin/bash
# scripts/verify-backups.sh

# Check backup exists
LATEST_BACKUP=$(ls -t /var/backups/learninghub/learninghub_backup_*.sql.gpg | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No recent backup found"
  exit 1
fi

# Check backup age (should be <24 hours old)
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))

if [ $BACKUP_AGE -gt 24 ]; then
  echo "ERROR: Latest backup is ${BACKUP_AGE} hours old"
  exit 1
fi

# Check backup size (should be >100MB for production data)
BACKUP_SIZE=$(stat -c%s "$LATEST_BACKUP")

if [ $BACKUP_SIZE -lt 104857600 ]; then
  echo "ERROR: Backup size is suspiciously small: ${BACKUP_SIZE} bytes"
  exit 1
fi

echo "SUCCESS: Backup verification passed"
exit 0
```

## Emergency Contacts

| Role | Name | Phone | Email | Escalation |
|------|------|-------|-------|------------|
| **Primary On-Call** | Engineering Team | +1-XXX-XXX-XXXX | oncall@learninghub.com | PagerDuty |
| **Database Admin** | DBA Team | +1-XXX-XXX-XXXX | dba@learninghub.com | Direct |
| **Security Lead** | Security Team | +1-XXX-XXX-XXXX | security@learninghub.com | Direct |
| **CTO** | [Name] | +1-XXX-XXX-XXXX | cto@learninghub.com | Executive |

## Compliance Requirements

### COPPA Data Recovery

**Requirements:**
- Parental consent records: 7-year retention
- Audit logs: 13-month retention
- Student data: Recoverable for active accounts

**Validation:**
```sql
-- Verify consent record backups
SELECT COUNT(*) FROM "User" WHERE "isMinor" = true AND "consentRecordId" IS NOT NULL;

-- Check audit log coverage
SELECT MIN("timestamp"), MAX("timestamp") FROM "AuditLog" WHERE "archived" = false;
```

### FERPA Compliance

**Requirements:**
- Educational records accessible within 45 days
- No unauthorized disclosure during recovery
- Audit trail of all access

## Post-Incident Procedures

1. **Incident Report** (within 24 hours)
   - Timeline of events
   - Root cause analysis
   - Impact assessment
   - Recovery actions taken

2. **Post-Mortem** (within 1 week)
   - Team review meeting
   - Process improvements identified
   - Runbook updates
   - Training needs

3. **Compliance Notifications** (as required)
   - COPPA breach notification (if applicable)
   - FERPA violation reporting (if applicable)
   - User communications

## Resources

- **Runbooks:** `/docs/runbooks/`
- **Backup Scripts:** `/scripts/`
- **Monitoring Dashboard:** https://app.datadoghq.com/dashboard/learning-hub
- **Incident Management:** https://learninghub.pagerduty.com
- **Documentation:** https://docs.learninghub.com/disaster-recovery

## Document Maintenance

- **Owner:** Infrastructure Team
- **Review Frequency:** Quarterly
- **Last Updated:** 2026-02-09
- **Next Review:** 2026-05-09
