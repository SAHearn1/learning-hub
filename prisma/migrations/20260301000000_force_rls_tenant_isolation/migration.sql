-- Companion migration: FORCE ROW LEVEL SECURITY on all tenant-scoped tables.
--
-- This makes RLS apply even to the table-owner role (the single role
-- used by Neon / Vercel Postgres).  Without FORCE, the owner bypasses
-- all policies — making the previous migration's policies dormant.
--
-- Prerequisites:
--   1. Migration 20260228200000 (ENABLE RLS + CREATE POLICY) applied.
--   2. `withApiHandler` → `requireUser()` → `setTenantId()` pipeline
--      is deployed, so every authenticated request sets
--      `app.current_tenant_id` via AsyncLocalStorage → Prisma $extends.
--   3. Public/webhook/cron routes that skip `requireUser()` must NOT
--      query tenant-scoped tables, OR must use `withRLSBypass()`.

ALTER TABLE "School"               FORCE ROW LEVEL SECURITY;
ALTER TABLE "Term"                 FORCE ROW LEVEL SECURITY;
ALTER TABLE "Course"               FORCE ROW LEVEL SECURITY;
ALTER TABLE "Class"                FORCE ROW LEVEL SECURITY;
ALTER TABLE "ClassEnrollment"      FORCE ROW LEVEL SECURITY;
ALTER TABLE "Assignment"           FORCE ROW LEVEL SECURITY;
ALTER TABLE "Submission"           FORCE ROW LEVEL SECURITY;
ALTER TABLE "Grade"                FORCE ROW LEVEL SECURITY;
ALTER TABLE "User"                 FORCE ROW LEVEL SECURITY;
ALTER TABLE "Session"              FORCE ROW LEVEL SECURITY;
ALTER TABLE "FiveRTemplate"        FORCE ROW LEVEL SECURITY;
ALTER TABLE "Progress"             FORCE ROW LEVEL SECURITY;
ALTER TABLE "AIUsageLedger"        FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"             FORCE ROW LEVEL SECURITY;
ALTER TABLE "NVCQualityEvaluation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AiSuggestionReview"   FORCE ROW LEVEL SECURITY;
