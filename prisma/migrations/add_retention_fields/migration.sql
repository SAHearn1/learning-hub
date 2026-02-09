-- Add data retention fields for COPPA compliance

-- Session retention fields
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Session_deletedAt_idx" ON "Session"("deletedAt");
CREATE INDEX IF NOT EXISTS "Session_updatedAt_idx" ON "Session"("updatedAt");

-- Assessment retention fields
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "isAnonymized" BOOLEAN DEFAULT false;
ALTER TABLE "Assessment" ADD COLUMN IF NOT EXISTS "anonymizedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Assessment_isAnonymized_idx" ON "Assessment"("isAnonymized");

-- User consent retention fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consentArchived" BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consentArchivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_consentArchived_idx" ON "User"("consentArchived");

-- Audit log retention fields
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN DEFAULT false;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AuditLog_archived_idx" ON "AuditLog"("archived");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
