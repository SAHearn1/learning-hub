-- ============================================================
-- Migration: 20260226000000_add_lms_irt_srs_nvc
-- Adds:   Term, Course, Assignment, Submission, Grade,
--         FiveRTemplate, ItemCalibration, StudentAbility,
--         ResponseData, ReviewSchedule, ReviewHistory,
--         NVCQualityEvaluation
-- Alters: Class (add courseId, termId)
--         Topic (add fiveRsAlignment)
-- Drops:  AiSuggestionReview (removed from schema)
-- ============================================================

-- ─── New Enums ───────────────────────────────────────────────

CREATE TYPE "AssignmentType" AS ENUM ('HOMEWORK', 'QUIZ', 'TEST', 'PROJECT', 'DISCUSSION', 'FIVE_R_SESSION');

CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'GRADED');

CREATE TYPE "ItemType" AS ENUM ('ASSESSMENT', 'PROBLEM');

CREATE TYPE "IRTModel" AS ENUM ('ONE_PL', 'TWO_PL', 'THREE_PL');

CREATE TYPE "ConceptType" AS ENUM ('STANDARD', 'TOPIC', 'PROBLEM');

CREATE TYPE "ReviewState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');

CREATE TYPE "ReviewRating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

CREATE TYPE "NVCConcern" AS ENUM (
    'JUDGMENTAL_LANGUAGE', 'DISMISSIVE_TONE', 'LACK_OF_EMPATHY',
    'AUTHORITARIAN_LANGUAGE', 'SHAMING_LANGUAGE', 'COMPARISON',
    'DEMAND_VS_REQUEST', 'DIAGNOSIS_VS_OBSERVATION',
    'BLAME_LANGUAGE', 'COERCIVE_LANGUAGE'
);

CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'APPROVED', 'FLAGGED', 'DISMISSED');

CREATE TYPE "AdminAction" AS ENUM ('NONE', 'REVISED_RESPONSE', 'EDUCATOR_NOTIFIED', 'SYSTEM_IMPROVEMENT', 'FALSE_POSITIVE');

-- ─── Term ────────────────────────────────────────────────────

CREATE TABLE "Term" (
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

CREATE INDEX "Term_tenantId_idx" ON "Term"("tenantId");

-- ─── Course ──────────────────────────────────────────────────

CREATE TABLE "Course" (
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

CREATE INDEX "Course_tenantId_idx" ON "Course"("tenantId");

-- ─── FiveRTemplate ───────────────────────────────────────────
-- Must be created before Assignment (Assignment has templateId FK)

CREATE TABLE "FiveRTemplate" (
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

CREATE INDEX "FiveRTemplate_tenantId_idx" ON "FiveRTemplate"("tenantId");
CREATE INDEX "FiveRTemplate_tenantId_subject_idx" ON "FiveRTemplate"("tenantId", "subject");

ALTER TABLE "FiveRTemplate" ADD CONSTRAINT "FiveRTemplate_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Assignment ──────────────────────────────────────────────

CREATE TABLE "Assignment" (
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

CREATE INDEX "Assignment_tenantId_idx" ON "Assignment"("tenantId");
CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");
CREATE INDEX "Assignment_classId_dueDate_idx" ON "Assignment"("classId", "dueDate");
CREATE INDEX "Assignment_templateId_idx" ON "Assignment"("templateId");

ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "FiveRTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Submission ──────────────────────────────────────────────

CREATE TABLE "Submission" (
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

CREATE UNIQUE INDEX "Submission_assignmentId_studentId_key" ON "Submission"("assignmentId", "studentId");
CREATE INDEX "Submission_tenantId_idx" ON "Submission"("tenantId");
CREATE INDEX "Submission_assignmentId_idx" ON "Submission"("assignmentId");
CREATE INDEX "Submission_studentId_idx" ON "Submission"("studentId");

ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Grade ───────────────────────────────────────────────────

CREATE TABLE "Grade" (
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

CREATE UNIQUE INDEX "Grade_submissionId_key" ON "Grade"("submissionId");
CREATE INDEX "Grade_tenantId_idx" ON "Grade"("tenantId");
CREATE INDEX "Grade_submissionId_idx" ON "Grade"("submissionId");

ALTER TABLE "Grade" ADD CONSTRAINT "Grade_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_gradedById_fkey"
    FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── ItemCalibration ─────────────────────────────────────────

CREATE TABLE "ItemCalibration" (
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

CREATE UNIQUE INDEX "ItemCalibration_assessmentId_key" ON "ItemCalibration"("assessmentId");
CREATE UNIQUE INDEX "ItemCalibration_problemId_key" ON "ItemCalibration"("problemId");
CREATE INDEX "ItemCalibration_irtDifficulty_idx" ON "ItemCalibration"("irtDifficulty");
CREATE INDEX "ItemCalibration_itemType_idx" ON "ItemCalibration"("itemType");

ALTER TABLE "ItemCalibration" ADD CONSTRAINT "ItemCalibration_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ItemCalibration" ADD CONSTRAINT "ItemCalibration_problemId_fkey"
    FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── StudentAbility ──────────────────────────────────────────

CREATE TABLE "StudentAbility" (
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

CREATE UNIQUE INDEX "StudentAbility_studentId_subject_key" ON "StudentAbility"("studentId", "subject");
CREATE INDEX "StudentAbility_studentId_idx" ON "StudentAbility"("studentId");
CREATE INDEX "StudentAbility_subject_idx" ON "StudentAbility"("subject");

ALTER TABLE "StudentAbility" ADD CONSTRAINT "StudentAbility_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── ResponseData ────────────────────────────────────────────

CREATE TABLE "ResponseData" (
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

CREATE INDEX "ResponseData_assessmentId_idx" ON "ResponseData"("assessmentId");
CREATE INDEX "ResponseData_studentId_idx" ON "ResponseData"("studentId");
CREATE INDEX "ResponseData_itemCalibrationId_idx" ON "ResponseData"("itemCalibrationId");

ALTER TABLE "ResponseData" ADD CONSTRAINT "ResponseData_assessmentId_fkey"
    FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── ReviewSchedule ──────────────────────────────────────────

CREATE TABLE "ReviewSchedule" (
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

CREATE UNIQUE INDEX "ReviewSchedule_studentId_conceptType_standardId_topicId_problemId_key"
    ON "ReviewSchedule"("studentId", "conceptType", "standardId", "topicId", "problemId");
CREATE INDEX "ReviewSchedule_studentId_idx" ON "ReviewSchedule"("studentId");
CREATE INDEX "ReviewSchedule_studentId_dueDate_idx" ON "ReviewSchedule"("studentId", "dueDate");
CREATE INDEX "ReviewSchedule_dueDate_idx" ON "ReviewSchedule"("dueDate");
CREATE INDEX "ReviewSchedule_state_idx" ON "ReviewSchedule"("state");

ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_standardId_fkey"
    FOREIGN KEY ("standardId") REFERENCES "Standard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_topicId_fkey"
    FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReviewSchedule" ADD CONSTRAINT "ReviewSchedule_problemId_fkey"
    FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── ReviewHistory ───────────────────────────────────────────

CREATE TABLE "ReviewHistory" (
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

CREATE INDEX "ReviewHistory_scheduleId_idx" ON "ReviewHistory"("scheduleId");
CREATE INDEX "ReviewHistory_reviewedAt_idx" ON "ReviewHistory"("reviewedAt");

ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_scheduleId_fkey"
    FOREIGN KEY ("scheduleId") REFERENCES "ReviewSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── NVCQualityEvaluation ────────────────────────────────────

CREATE TABLE "NVCQualityEvaluation" (
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

CREATE INDEX "NVCQualityEvaluation_messageId_idx" ON "NVCQualityEvaluation"("messageId");
CREATE INDEX "NVCQualityEvaluation_sessionId_idx" ON "NVCQualityEvaluation"("sessionId");
CREATE INDEX "NVCQualityEvaluation_tenantId_idx" ON "NVCQualityEvaluation"("tenantId");
CREATE INDEX "NVCQualityEvaluation_reviewStatus_idx" ON "NVCQualityEvaluation"("reviewStatus");
CREATE INDEX "NVCQualityEvaluation_evaluatedAt_idx" ON "NVCQualityEvaluation"("evaluatedAt");
CREATE INDEX "NVCQualityEvaluation_isCompliant_idx" ON "NVCQualityEvaluation"("isCompliant");

ALTER TABLE "NVCQualityEvaluation" ADD CONSTRAINT "NVCQualityEvaluation_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Alter Class: add courseId and termId ────────────────────

ALTER TABLE "Class" ADD COLUMN "courseId" TEXT;
ALTER TABLE "Class" ADD COLUMN "termId" TEXT;

CREATE INDEX "Class_courseId_idx" ON "Class"("courseId");
CREATE INDEX "Class_termId_idx" ON "Class"("termId");

ALTER TABLE "Class" ADD CONSTRAINT "Class_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Class" ADD CONSTRAINT "Class_termId_fkey"
    FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Alter Topic: add fiveRsAlignment ───────────────────────

ALTER TABLE "Topic" ADD COLUMN "fiveRsAlignment" JSONB;

-- ─── Drop AiSuggestionReview (removed from schema) ──────────

DROP TABLE IF EXISTS "AiSuggestionReview";
