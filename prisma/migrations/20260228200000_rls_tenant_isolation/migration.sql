-- Defence-in-depth: PostgreSQL Row-Level Security for tenant isolation.
--
-- Every table with a "tenantId" column gets an RLS policy that restricts
-- SELECT / INSERT / UPDATE / DELETE to rows matching the session variable
-- `app.current_tenant_id`.  A bypass flag `app.bypass_rls` allows
-- migrations, seeding, and platform-admin operations to access all rows.
--
-- NOTE: We intentionally use ENABLE ROW LEVEL SECURITY (not FORCE) so
-- that the table-owner role used by Prisma migrations is unaffected.
-- To fully enforce RLS on the owner role (e.g. when using a single
-- Neon role), run the companion migration that adds
-- ALTER TABLE ... FORCE ROW LEVEL SECURITY after integrating the
-- withTenantRLS() middleware into all API routes.

-- =========================================================================
-- 1. Enable RLS on all tenant-scoped tables
-- =========================================================================

ALTER TABLE "School"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Term"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassEnrollment"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assignment"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Submission"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Grade"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FiveRTemplate"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Progress"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIUsageLedger"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NVCQualityEvaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiSuggestionReview"   ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. Create tenant-isolation policies (SELECT + DML)
-- =========================================================================
-- Policy logic:
--   ALLOW when bypass_rls = 'on'            (migrations / admin)
--   ALLOW when tenantId matches session var  (normal request flow)
--   DENY  otherwise                          (default-deny)
--
-- current_setting(name, true) returns NULL when the GUC is not set,
-- so unset sessions see zero rows (safe default).

-- School
CREATE POLICY tenant_isolation_school ON "School"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- Term
CREATE POLICY tenant_isolation_term ON "Term"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- Course
CREATE POLICY tenant_isolation_course ON "Course"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- Class
CREATE POLICY tenant_isolation_class ON "Class"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- ClassEnrollment
CREATE POLICY tenant_isolation_class_enrollment ON "ClassEnrollment"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- Assignment
CREATE POLICY tenant_isolation_assignment ON "Assignment"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- Submission
CREATE POLICY tenant_isolation_submission ON "Submission"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- Grade
CREATE POLICY tenant_isolation_grade ON "Grade"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- User
CREATE POLICY tenant_isolation_user ON "User"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- Session
CREATE POLICY tenant_isolation_session ON "Session"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- FiveRTemplate
CREATE POLICY tenant_isolation_five_r_template ON "FiveRTemplate"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- Progress
CREATE POLICY tenant_isolation_progress ON "Progress"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- AIUsageLedger
CREATE POLICY tenant_isolation_ai_usage_ledger ON "AIUsageLedger"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- AuditLog
CREATE POLICY tenant_isolation_audit_log ON "AuditLog"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- NVCQualityEvaluation
CREATE POLICY tenant_isolation_nvc_quality_evaluation ON "NVCQualityEvaluation"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );

-- AiSuggestionReview
CREATE POLICY tenant_isolation_ai_suggestion_review ON "AiSuggestionReview"
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = current_setting('app.current_tenant_id', true)
  );
