-- CreateEnum
CREATE TYPE "IngestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "IngestLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "subject" "Subject",
    "gradeLevel" INTEGER[],
    "standardCodes" TEXT[],
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "vectorIds" TEXT[],
    "status" "IngestStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestLog_tenantId_idx" ON "IngestLog"("tenantId");

-- CreateIndex
CREATE INDEX "IngestLog_status_idx" ON "IngestLog"("status");
