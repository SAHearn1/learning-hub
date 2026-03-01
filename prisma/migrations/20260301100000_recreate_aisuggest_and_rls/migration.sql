-- Combined migration:
-- 1. Recreate AiSuggestionReview table (dropped by 20260226000000, still in schema)
-- 2. Enable RLS + create policies on all 16 tenant-scoped tables
-- 3. Force RLS so policies apply to the table-owner role (Neon single-role)

-- =========================================================================
-- 1. Recreate AiSuggestionReview (with correct enum names)
-- =========================================================================

DO $$ BEGIN
  CREATE TYPE "AiSuggestionDecision" AS ENUM ('ACCEPTED', 'REJECTED', 'MODIFIED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AiSuggestionType" AS ENUM (
    'TUTORING_RESPONSE', 'IEP_RECOMMENDATION', 'ASSESSMENT_FEEDBACK',
    'ACCOMMODATION_SUGGESTION', 'PROGRESS_NOTE'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AiReviewStatus" AS ENUM (
    'PENDING_REVIEW', 'APPROVED', 'APPROVED_WITH_EDITS', 'REJECTED', 'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "AiSuggestionReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "suggestionType" "AiSuggestionType" NOT NULL,
    "originalContent" TEXT NOT NULL,
    "editedContent" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "guardrailFlags" JSONB,
    "contextSnapshot" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "reviewStatus" "AiReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewerId" TEXT,
    "reviewerNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSuggestionReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiSuggestionReview_tenantId_idx" ON "AiSuggestionReview"("tenantId");
CREATE INDEX IF NOT EXISTS "AiSuggestionReview_tenantId_reviewStatus_idx" ON "AiSuggestionReview"("tenantId", "reviewStatus");
CREATE INDEX IF NOT EXISTS "AiSuggestionReview_reviewerId_idx" ON "AiSuggestionReview"("reviewerId");
CREATE INDEX IF NOT EXISTS "AiSuggestionReview_sessionId_idx" ON "AiSuggestionReview"("sessionId");
CREATE INDEX IF NOT EXISTS "AiSuggestionReview_reviewStatus_idx" ON "AiSuggestionReview"("reviewStatus");
CREATE INDEX IF NOT EXISTS "AiSuggestionReview_priority_idx" ON "AiSuggestionReview"("priority");

DO $$ BEGIN
    ALTER TABLE "AiSuggestionReview" ADD CONSTRAINT "AiSuggestionReview_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "AiSuggestionReview" ADD CONSTRAINT "AiSuggestionReview_reviewerId_fkey"
        FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "AiSuggestionReview" ADD CONSTRAINT "AiSuggestionReview_sessionId_fkey"
        FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========================================================================
-- 2. Enable RLS on all 16 tenant-scoped tables (idempotent)
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
-- 3. Create tenant-isolation policies (idempotent via DROP IF EXISTS)
-- =========================================================================

DROP POLICY IF EXISTS tenant_isolation_school ON "School";
CREATE POLICY tenant_isolation_school ON "School"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_term ON "Term";
CREATE POLICY tenant_isolation_term ON "Term"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_course ON "Course";
CREATE POLICY tenant_isolation_course ON "Course"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_class ON "Class";
CREATE POLICY tenant_isolation_class ON "Class"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_class_enrollment ON "ClassEnrollment";
CREATE POLICY tenant_isolation_class_enrollment ON "ClassEnrollment"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_assignment ON "Assignment";
CREATE POLICY tenant_isolation_assignment ON "Assignment"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_submission ON "Submission";
CREATE POLICY tenant_isolation_submission ON "Submission"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_grade ON "Grade";
CREATE POLICY tenant_isolation_grade ON "Grade"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_user ON "User";
CREATE POLICY tenant_isolation_user ON "User"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_session ON "Session";
CREATE POLICY tenant_isolation_session ON "Session"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_five_r_template ON "FiveRTemplate";
CREATE POLICY tenant_isolation_five_r_template ON "FiveRTemplate"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_progress ON "Progress";
CREATE POLICY tenant_isolation_progress ON "Progress"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_ai_usage_ledger ON "AIUsageLedger";
CREATE POLICY tenant_isolation_ai_usage_ledger ON "AIUsageLedger"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_audit_log ON "AuditLog";
CREATE POLICY tenant_isolation_audit_log ON "AuditLog"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_nvc_quality_evaluation ON "NVCQualityEvaluation";
CREATE POLICY tenant_isolation_nvc_quality_evaluation ON "NVCQualityEvaluation"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_ai_suggestion_review ON "AiSuggestionReview";
CREATE POLICY tenant_isolation_ai_suggestion_review ON "AiSuggestionReview"
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = current_setting('app.current_tenant_id', true));

-- =========================================================================
-- 4. Force RLS on all 16 tables (applies policies to table owner too)
-- =========================================================================

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
