-- Add consentGrantedAt field to User table (schema parity fix)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consentGrantedAt" TIMESTAMP(3);
