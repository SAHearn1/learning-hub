-- Add immutable hash-chain support for audit logs
ALTER TABLE "AuditLog"
ADD COLUMN     "previousHash" TEXT,
ADD COLUMN     "chainHash" TEXT;

UPDATE "AuditLog"
SET "chainHash" = md5("id" || ':' || EXTRACT(EPOCH FROM "timestamp")::text)
WHERE "chainHash" IS NULL;

ALTER TABLE "AuditLog"
ALTER COLUMN "chainHash" SET NOT NULL;

CREATE UNIQUE INDEX "AuditLog_chainHash_key" ON "AuditLog"("chainHash");
