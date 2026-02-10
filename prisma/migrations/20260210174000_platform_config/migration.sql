-- Add global platform configuration for ingestion controls
CREATE TABLE "PlatformConfig" (
  "key" TEXT NOT NULL DEFAULT 'default',
  "ingestionEnabled" BOOLEAN NOT NULL DEFAULT true,
  "ingestionDisabledAt" TIMESTAMP(3),
  "ingestionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("key")
);

INSERT INTO "PlatformConfig" ("key", "ingestionEnabled", "createdAt", "updatedAt")
VALUES ('default', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
