-- Migration: add_ingestlog_tenantid_contenthash
-- Adds tenantId (nullable, for multi-tenant audit compliance) and
-- contentHash (SHA-256 of payload, for curriculum ingest idempotency)
-- to the IngestLog table.

ALTER TABLE "IngestLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "IngestLog" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;

-- Index on tenantId for per-tenant audit queries
CREATE INDEX IF NOT EXISTS "IngestLog_tenantId_idx" ON "IngestLog"("tenantId");

-- Composite index on (contentHash, status) for fast idempotency look-up
CREATE INDEX IF NOT EXISTS "IngestLog_contentHash_status_idx" ON "IngestLog"("contentHash", "status");
