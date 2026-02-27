-- ============================================================
-- Migration: 20260226000000_add_lms_irt_srs_nvc
-- Idempotent: all statements guard against already-existing objects
-- ============================================================

-- ─── New Enums (DO block catches duplicate_object) ───────────

DO $$ BEGIN
    CREATE TYPE "AssignmentType" AS ENUM ('HOMEWORK', 'QUIZ', 'TEST', 'PROJECT', 'DISCUSSION', 'FIVE_R_SESSION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'GRADED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ItemType" AS ENUM ('ASSESSMENT', 'PROBLEM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "IRTModel" AS ENUM ('ONE_PL', 'TWO_PL', 'THREE_PL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ConceptType" AS ENUM ('STANDARD', 'TOPIC', 'PROBLEM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ReviewState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "NVCConcern" AS ENUM (
        'JUDGMENTAL_LANGUAGE', 'DISMISSIVE_TONE', 'LACK_OF_EMPATHY',
        'AUTHORITARIAN_LANGUAGE', 'SHAMING_LANGUAGE', 'COMPARISON',
        'DEMAND_VS_REQUEST', 'DIAGNOSIS_VS_OBSERVATION',
        'BLAME_LANGUAGE', 'COERCIVE_LANGUAGE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPROVED', 'FLAGGED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;
-- Ensure required values exist when ReviewStatus was pre-created with different members
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'REVIEWED';
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'FLAGGED';
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'DISMISSED';

DO $$ BEGIN
    CREATE TYPE "AdminAction" AS ENUM ('NONE', 'REVISED_RESPONSE', 'EDUCATOR_NOTIFIED', 'SYSTEM_IMPROVEMENT', 'FALSE_POSITIVE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Term ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Term" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Term_tenantId_idx" ON "Term"("tenantId");

-- ─── Course ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Course" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" "Subject" NOT NULL,
    "gradeLevel" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Course_tenantId_idx" ON "Course"("tenantId");

-- ─── FiveRTemplate ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "FiveRTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" "Subject" NOT NULL,
    "gradeLevel" INTEGER[],
    "phases" JSONB NOT NULL,
    "totalDurationMinutes" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiveRTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FiveRTemplate_tenantId_idx" ON "FiveRTemplate"("tenantId");
CREATE INDEX IF NOT EXISTS "FiveRTemplate_tenantId_subject_idx" ON "FiveRTemplate"("tenantId", "subject");

DO $$ BEGIN
    ALTER TABLE "FiveRTemplate" ADD CONSTRAINT "FiveRTemplate_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Assignment ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Assignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "AssignmentType" NOT NULL DEFAULT 'HOMEWORK',
    "dueDate" TIMESTAMP(3),
    "points" INTEGER NOT NULL DEFAULT 100,
    "rubric" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Assignment_tenantId_idx" ON "Assignment"("tenantId");
CREATE INDEX IF NOT EXISTS "Assignment_classId_idx" ON "Assignment"("classId");
CREATE INDEX IF NOT EXISTS "Assignment_classId_dueDate_idx" ON "Assignment"("classId", "dueDate");
CREATE INDEX IF NOT EXISTS "Assignment_templateId_idx" ON "Assignment"("templateId");

DO $$ BEGIN
    ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey"
        FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "FiveRTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Submission ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Submission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "content" TEXT,
    "attachments" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Submission_assignmentId_studentId_key" ON "Submission"("assignmentId", "studentId");
CREATE INDEX IF NOT EXISTS "Submission_tenantId_idx" ON "Submission"("tenantId");
CREATE INDEX IF NOT EXISTS "Submission_assignmentId_idx" ON "Submission"("assignmentId");
CREATE INDEX IF NOT EXISTS "Submission_studentId_idx" ON "Submission"("studentId");

DO $$ BEGIN
    ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentId_fkey"
        FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Grade ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Grade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "gradedById" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "percentage" DOUBLE PRECISION NOT NULL,
    "letterGrade" TEXT,
    "feedback" TEXT,
    "rubricScores" JSONB,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Grade_submissionId_key" ON "Grade"("submissionId");
CREATE INDEX IF NOT EXISTS "Grade_tenantId_idx" ON "Grade"("tenantId");
CREATE INDEX IF NOT EXISTS "Grade_submissionId_idx" ON "Grade"("submissionId");

DO $$ BEGIN
    ALTER TABLE "Grade" ADD CONSTRAINT "Grade_submissionId_fkey"
        FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Grade" ADD CONSTRAINT "Grade_gradedById_fkey"
        FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── ItemCalibration ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ItemCalibration" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT,
    "problemId" TEXT,
    "itemType" "ItemType" NOT NULL DEFAULT 'ASSESSMENT',
    "irtDifficulty" DOUBLE PRECISION NOT NULL,
    "irtDiscrimination" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "irtGuessing" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "calibrationModel" "IRTModel" NOT NULL DEFAULT 'TWO_PL',
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "standardError" DOUBLE PRECISION,
    "itemInformation" DOUBLE PRECISION,
    "reliabilityIndex" DOUBLE PRECISION,
    "lastCalibratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCalibration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItemCalibration_assessmentId_key" ON "ItemCalibration"("assessmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ItemCalibration_problemId_key" ON "ItemCalibration"("problemId");
CREATE INDEX IF NOT EXISTS "ItemCalibration_irtDifficulty_idx" ON "ItemCalibration"("irtDifficulty");
CREATE INDEX IF NOT EXISTS "ItemCalibration_itemType_idx" ON "ItemCalibration"("itemType");

DO $$ BEGIN
    ALTER TABLE "ItemCalibration" ADD CONSTRAINT "ItemCalibration_assessmentId_fkey"
        FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "ItemCalibration" ADD CONSTRAINT "ItemCalibration_problemId_fkey"
        FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── StudentAbility ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "StudentAbility" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" "Subject" NOT NULL,
    "currentTheta" DOUBLE PRECISION NOT NULL,
    "standardError" DOUBLE PRECISION NOT NULL,
    "confidenceIntervalLower" DOUBLE PRECISION NOT NULL,
    "confidenceIntervalUpper" DOUBLE PRECISION NOT NULL,
    "reliabilityIndex" DOUBLE PRECISION NOT NULL,
    "assessmentCount" INTEGER NOT NULL DEFAULT 0,
    "lastEstimatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAbility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentAbility_studentId_subject_key" ON "StudentAbility"("studentId", "subject");
CREATE INDEX IF NOT EXISTS "StudentAbility_studentId_idx" ON "StudentAbility"("studentId");
CREATE INDEX IF NOT EXISTS "StudentAbility_subject_idx" ON "StudentAbility"("subject");

DO $$ BEGIN
    ALTER TABLE "StudentAbility" ADD CONSTRAINT "StudentAbility_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── ResponseData ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ResponseData" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "itemCalibrationId" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "responseTime" INTEGER,
    "probabilityPredicted" DOUBLE PRECISION,
    "residual" DOUBLE PRECISION,
    "studentTheta" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponseData_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ResponseData_assessmentId_idx" ON "ResponseData"("assessmentId");
CREATE INDEX IF NOT EXISTS "ResponseData_studentId_idx" ON "ResponseData"("studentId");
CREATE INDEX IF NOT EXISTS "ResponseData_itemCalibrationId_idx" ON "ResponseData"("itemCalibrationId");

DO $$ BEGIN
    ALTER TABLE "ResponseData" ADD CONSTRAINT "ResponseData_assessmentId_fkey"
        FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── ReviewSchedule ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ReviewSchedule" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "conceptType" "ConceptType" NOT NULL,
    "standardId" TEXT,
    "topicId" TEXT,
    "problemId" TEXT,
    "state" "ReviewState" NOT NULL DEFAULT 'NEW',
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "elapsedDays" INTEGER NOT NULL DEFAULT 0,
    "scheduledDays" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "lastReviewDate" TIMESTAMP(3),
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReviewSchedule_studentId_conceptType_standardId_topicId_problemId_key"
    ON "ReviewSchedule"("studentId", "conceptType", "standardId", "topicId", "problemId");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_studentId_idx" ON "ReviewSchedule"("studentId");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_studentId_dueDate_idx" ON "ReviewSchedule"("studentId", "dueDate");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_dueDate_idx" ON "ReviewSchedule"("dueDate");
CREATE INDEX IF NOT EXISTS "ReviewSchedule_state_idx" ON "ReviewSchedule"("state");

DO $$ BEGIN
    ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_standardId_fkey"
        FOREIGN KEY ("standardId") REFERENCES "Standard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_topicId_fkey"
        FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_problemId_fkey"
        FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── ReviewHistory ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ReviewHistory" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "rating" "ReviewRating" NOT NULL,
    "state" "ReviewState" NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elapsedDays" INTEGER NOT NULL,
    "scheduledDays" INTEGER NOT NULL,
    "previousStability" DOUBLE PRECISION NOT NULL,
    "newStability" DOUBLE PRECISION NOT NULL,
    "previousDifficulty" DOUBLE PRECISION NOT NULL,
    "newDifficulty" DOUBLE PRECISION NOT NULL,
    "responseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReviewHistory_scheduleId_idx" ON "ReviewHistory"("scheduleId");
CREATE INDEX IF NOT EXISTS "ReviewHistory_reviewedAt_idx" ON "ReviewHistory"("reviewedAt");

DO $$ BEGIN
    ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_scheduleId_fkey"
        FOREIGN KEY ("scheduleId") REFERENCES "ReviewSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── NVCQualityEvaluation ────────────────────────────────────

CREATE TABLE IF NOT EXISTS "NVCQualityEvaluation" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCompliant" BOOLEAN NOT NULL,
    "nvcScore" DOUBLE PRECISION NOT NULL,
    "concerns" "NVCConcern"[],
    "judgmentalPhrases" TEXT[],
    "dismissivePhrases" TEXT[],
    "suggestedRevisions" TEXT[],
    "rawAnalysis" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    "llmTokens" INTEGER NOT NULL,
    "llmLatencyMs" INTEGER NOT NULL,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "adminAction" "AdminAction",
    "actionTakenAt" TIMESTAMP(3),

    CONSTRAINT "NVCQualityEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NVCQualityEvaluation_messageId_idx" ON "NVCQualityEvaluation"("messageId");
CREATE INDEX IF NOT EXISTS "NVCQualityEvaluation_sessionId_idx" ON "NVCQualityEvaluation"("sessionId");
CREATE INDEX IF NOT EXISTS "NVCQualityEvaluation_tenantId_idx" ON "NVCQualityEvaluation"("tenantId");
CREATE INDEX IF NOT EXISTS "NVCQualityEvaluation_reviewStatus_idx" ON "NVCQualityEvaluation"("reviewStatus");
CREATE INDEX IF NOT EXISTS "NVCQualityEvaluation_evaluatedAt_idx" ON "NVCQualityEvaluation"("evaluatedAt");
CREATE INDEX IF NOT EXISTS "NVCQualityEvaluation_isCompliant_idx" ON "NVCQualityEvaluation"("isCompliant");

DO $$ BEGIN
    ALTER TABLE "NVCQualityEvaluation" ADD CONSTRAINT "NVCQualityEvaluation_messageId_fkey"
        FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Alter Class: add courseId and termId ────────────────────

ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "termId" TEXT;

CREATE INDEX IF NOT EXISTS "Class_courseId_idx" ON "Class"("courseId");
CREATE INDEX IF NOT EXISTS "Class_termId_idx" ON "Class"("termId");

DO $$ BEGIN
    ALTER TABLE "Class" ADD CONSTRAINT "Class_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Class" ADD CONSTRAINT "Class_termId_fkey"
        FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Alter Topic: add fiveRsAlignment ───────────────────────

ALTER TABLE "Topic" ADD COLUMN IF NOT EXISTS "fiveRsAlignment" JSONB;

-- ─── Drop AiSuggestionReview (removed from schema) ──────────

DROP TABLE IF EXISTS "AiSuggestionReview";
