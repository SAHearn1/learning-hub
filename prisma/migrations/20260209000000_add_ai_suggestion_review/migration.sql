-- AI Suggestion Review table for Human-in-the-Loop workflow
CREATE TYPE "SuggestionType" AS ENUM ('TUTORING_RESPONSE', 'IEP_RECOMMENDATION', 'ASSESSMENT_FEEDBACK', 'ACCOMMODATION_SUGGESTION', 'PROGRESS_NOTE');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'APPROVED_WITH_EDITS', 'REJECTED', 'EXPIRED', 'PENDING', 'REVIEWED', 'FLAGGED', 'DISMISSED');

CREATE TABLE "AiSuggestionReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "suggestionType" "SuggestionType" NOT NULL,
    "originalContent" TEXT NOT NULL,
    "editedContent" TEXT,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewerId" TEXT,
    "reviewerNotes" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "guardrailFlags" JSONB,
    "contextSnapshot" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSuggestionReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiSuggestionReview_tenantId_idx" ON "AiSuggestionReview"("tenantId");
CREATE INDEX "AiSuggestionReview_studentId_idx" ON "AiSuggestionReview"("studentId");
CREATE INDEX "AiSuggestionReview_reviewStatus_idx" ON "AiSuggestionReview"("reviewStatus");
CREATE INDEX "AiSuggestionReview_reviewerId_idx" ON "AiSuggestionReview"("reviewerId");
CREATE INDEX "AiSuggestionReview_suggestionType_idx" ON "AiSuggestionReview"("suggestionType");
