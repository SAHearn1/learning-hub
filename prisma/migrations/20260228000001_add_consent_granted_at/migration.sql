-- Add missing consentGrantedAt column to User table
-- This column is present in the Prisma schema but was omitted from the
-- 20260228000000_add_retention_fields migration. It records the timestamp
-- at which parental/user consent was explicitly granted.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consentGrantedAt" TIMESTAMP(3);
