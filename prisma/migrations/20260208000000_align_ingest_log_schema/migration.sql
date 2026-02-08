-- AlignIngestLogSchema
-- Corrects the IngestLog table to match the current Prisma schema.
-- The previous migration created IngestLog with document-tracking fields;
-- the schema has since been redesigned for general ingestion-event tracking.

-- Drop the old table
DROP TABLE IF EXISTS "IngestLog";

-- Drop the old enum
DROP TYPE IF EXISTS "IngestStatus";

-- Recreate enum with correct values
CREATE TYPE "IngestStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILURE', 'PROCESSING');

-- Create the IngestSource enum
CREATE TYPE "IngestSource" AS ENUM ('WEBHOOK', 'MANUAL', 'SCHEDULED', 'API');

-- Recreate IngestLog with the correct schema
CREATE TABLE "IngestLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "IngestStatus" NOT NULL,
    "source" "IngestSource" NOT NULL,
    "payload" JSONB,
    "errorMessage" TEXT,
    "processedFiles" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestLog_timestamp_idx" ON "IngestLog"("timestamp");

-- CreateIndex
CREATE INDEX "IngestLog_status_idx" ON "IngestLog"("status");

-- CreateIndex
CREATE INDEX "IngestLog_source_idx" ON "IngestLog"("source");
