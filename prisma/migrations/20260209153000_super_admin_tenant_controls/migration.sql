-- Add tenant suspension fields for super admin controls
ALTER TABLE "Tenant"
  ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT;
