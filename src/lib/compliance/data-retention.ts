/**
 * COPPA-Compliant Data Retention Enforcement
 * Automated enforcement of data retention policies
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

// Retention periods (in days)
export const RETENTION_POLICIES = {
  // Student learning session transcripts: 24 months after last activity
  SESSION_TRANSCRIPTS: 24 * 30, // 720 days

  // Assessment outcomes: 36 months after school year closes
  ASSESSMENTS: 36 * 30, // 1080 days

  // Parental consent records: 7 years from consent action (COPPA requirement)
  CONSENT_RECORDS: 7 * 365, // 2555 days

  // Security & compliance audit logs: 13 months rolling (SOC 2)
  AUDIT_LOGS: 13 * 30, // 390 days

  // Soft-deleted data grace period before hard delete
  SOFT_DELETE_GRACE_PERIOD: 30, // 30 days
} as const;

/**
 * Data retention job status
 */
export interface RetentionJobResult {
  jobId: string;
  startTime: Date;
  endTime: Date;
  recordsProcessed: number;
  recordsDeleted: number;
  recordsAnonymized: number;
  errors: string[];
  success: boolean;
}

/**
 * Run complete data retention enforcement
 */
export async function enforceDataRetention(): Promise<RetentionJobResult> {
  const jobId = `retention-${Date.now()}`;
  const startTime = new Date();
  const errors: string[] = [];
  let recordsProcessed = 0;
  let recordsDeleted = 0;
  let recordsAnonymized = 0;

  logger.info('Starting data retention enforcement', { jobId });

  try {
    // 1. Clean up old session transcripts
    const sessionResult = await cleanupOldSessions();
    recordsProcessed += sessionResult.processed;
    recordsDeleted += sessionResult.deleted;
    errors.push(...sessionResult.errors);

    // 2. Anonymize old assessments
    const assessmentResult = await anonymizeOldAssessments();
    recordsProcessed += assessmentResult.processed;
    recordsAnonymized += assessmentResult.anonymized;
    errors.push(...assessmentResult.errors);

    // 3. Archive old consent records
    const consentResult = await archiveOldConsentRecords();
    recordsProcessed += consentResult.processed;
    errors.push(...consentResult.errors);

    // 4. Rotate old audit logs
    const auditResult = await rotateOldAuditLogs();
    recordsProcessed += auditResult.processed;
    errors.push(...auditResult.errors);

    // 5. Purge soft-deleted data past grace period
    const purgeResult = await purgeSoftDeletedData();
    recordsProcessed += purgeResult.processed;
    recordsDeleted += purgeResult.deleted;
    errors.push(...purgeResult.errors);

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    logger.info('Data retention enforcement completed', {
      jobId,
      duration,
      recordsProcessed,
      recordsDeleted,
      recordsAnonymized,
      errorCount: errors.length,
    });

    // Create audit log entry
    await createAuditLog({
      action: 'DATA_RETENTION_ENFORCED',
      resource: 'SYSTEM',
      resourceId: jobId,
      details: {
        recordsProcessed,
        recordsDeleted,
        recordsAnonymized,
        errorCount: errors.length,
      },
      tenantId: 'SYSTEM',
      userId: 'SYSTEM',
    });

    return {
      jobId,
      startTime,
      endTime,
      recordsProcessed,
      recordsDeleted,
      recordsAnonymized,
      errors,
      success: errors.length === 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Data retention enforcement failed', { jobId, error: errorMessage });
    errors.push(errorMessage);

    return {
      jobId,
      startTime,
      endTime: new Date(),
      recordsProcessed,
      recordsDeleted,
      recordsAnonymized,
      errors,
      success: false,
    };
  }
}

/**
 * Clean up old session transcripts (24 months after last activity)
 */
async function cleanupOldSessions() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.SESSION_TRANSCRIPTS);

  let processed = 0;
  let deleted = 0;
  const errors: string[] = [];

  try {
    logger.info('Cleaning up old session transcripts', { cutoffDate });

    // Find sessions older than retention period
    const oldSessions = await prisma.session.findMany({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
        deletedAt: null, // Not already soft-deleted
      },
      select: {
        id: true,
        studentId: true,
        updatedAt: true,
      },
    });

    processed = oldSessions.length;
    logger.info(`Found ${processed} sessions to soft-delete`);

    for (const session of oldSessions) {
      try {
        // Soft delete: mark as deleted but keep data for grace period
        await prisma.session.update({
          where: { id: session.id },
          data: { deletedAt: new Date() },
        });

        deleted++;

        // Create audit log
        await createAuditLog({
          action: 'SESSION_SOFT_DELETED',
          resource: 'Session',
          resourceId: session.id,
          details: {
            reason: 'Retention policy: 24 months after last activity',
            lastActivity: session.updatedAt,
          },
          tenantId: 'SYSTEM',
          userId: 'SYSTEM',
        });
      } catch (error) {
        const errorMessage = `Failed to delete session ${session.id}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        logger.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    logger.info('Session cleanup completed', { processed, deleted, errors: errors.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Session cleanup failed', { error: errorMessage });
    errors.push(errorMessage);
  }

  return { processed, deleted, errors };
}

/**
 * Anonymize old assessment outcomes (36 months after school year closes)
 */
async function anonymizeOldAssessments() {
  const currentYear = new Date().getFullYear();
  const cutoffSchoolYear = currentYear - 3; // 3 years ago
  const cutoffDate = new Date(cutoffSchoolYear, 6, 1); // July 1st of 3 years ago

  let processed = 0;
  let anonymized = 0;
  const errors: string[] = [];

  try {
    logger.info('Anonymizing old assessments', { cutoffDate });

    // Find old assessments to anonymize
    const oldAssessments = await prisma.assessment.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        isAnonymized: false, // Not already anonymized
      },
      select: {
        id: true,
        studentId: true,
        createdAt: true,
      },
    });

    processed = oldAssessments.length;
    logger.info(`Found ${processed} assessments to anonymize`);

    for (const assessment of oldAssessments) {
      try {
        // Anonymize by removing PII but keeping aggregate data
        await prisma.assessment.update({
          where: { id: assessment.id },
          data: {
            studentId: 'ANONYMIZED',
            isAnonymized: true,
            anonymizedAt: new Date(),
            // Keep: scores, difficulty levels, topic IDs (for aggregate analysis)
            // Remove: student identifier
          },
        });

        anonymized++;

        // Create audit log
        await createAuditLog({
          action: 'ASSESSMENT_ANONYMIZED',
          resource: 'Assessment',
          resourceId: assessment.id,
          details: {
            reason: 'Retention policy: 36 months after school year closes',
            originalCreatedAt: assessment.createdAt,
          },
          tenantId: 'SYSTEM',
          userId: 'SYSTEM',
        });
      } catch (error) {
        const errorMessage = `Failed to anonymize assessment ${assessment.id}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        logger.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    logger.info('Assessment anonymization completed', {
      processed,
      anonymized,
      errors: errors.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Assessment anonymization failed', { error: errorMessage });
    errors.push(errorMessage);
  }

  return { processed, anonymized, errors };
}

/**
 * Archive old consent records (7 years from consent action)
 */
async function archiveOldConsentRecords() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.CONSENT_RECORDS);

  let processed = 0;
  const errors: string[] = [];

  try {
    logger.info('Archiving old consent records', { cutoffDate });

    // Count old consent records (for COPPA, we keep but archive)
    const oldConsents = await prisma.user.count({
      where: {
        isMinor: true,
        consentGrantedAt: {
          lt: cutoffDate,
        },
        consentArchived: false,
      },
    });

    processed = oldConsents;

    if (oldConsents > 0) {
      logger.info(`Found ${processed} consent records to archive`);

      // Mark as archived (encrypted storage, separate from active DB)
      await prisma.user.updateMany({
        where: {
          isMinor: true,
          consentGrantedAt: {
            lt: cutoffDate,
          },
          consentArchived: false,
        },
        data: {
          consentArchived: true,
          consentArchivedAt: new Date(),
        },
      });

      // Create audit log
      await createAuditLog({
        action: 'CONSENT_RECORDS_ARCHIVED',
        resource: 'User',
        resourceId: 'BULK',
        details: {
          reason: 'Retention policy: 7 years from consent action',
          count: oldConsents,
          cutoffDate,
        },
        tenantId: 'SYSTEM',
        userId: 'SYSTEM',
      });
    }

    logger.info('Consent archival completed', { processed, errors: errors.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Consent archival failed', { error: errorMessage });
    errors.push(errorMessage);
  }

  return { processed, errors };
}

/**
 * Rotate old audit logs (13 months rolling window)
 */
async function rotateOldAuditLogs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.AUDIT_LOGS);

  let processed = 0;
  const errors: string[] = [];

  try {
    logger.info('Rotating old audit logs', { cutoffDate });

    // Count old audit logs
    const oldLogs = await prisma.auditLog.count({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
        archived: false,
      },
    });

    processed = oldLogs;

    if (oldLogs > 0) {
      logger.info(`Found ${processed} audit logs to archive`);

      // Mark as archived (move to cold storage)
      await prisma.auditLog.updateMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
          archived: false,
        },
        data: {
          archived: true,
          archivedAt: new Date(),
        },
      });

      logger.info('Audit log rotation completed', { processed });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Audit log rotation failed', { error: errorMessage });
    errors.push(errorMessage);
  }

  return { processed, errors };
}

/**
 * Purge soft-deleted data past grace period (30 days)
 */
async function purgeSoftDeletedData() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_POLICIES.SOFT_DELETE_GRACE_PERIOD);

  let processed = 0;
  let deleted = 0;
  const errors: string[] = [];

  try {
    logger.info('Purging soft-deleted data', { cutoffDate });

    // Find soft-deleted sessions past grace period
    const sessionsToDelete = await prisma.session.findMany({
      where: {
        deletedAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    processed = sessionsToDelete.length;
    logger.info(`Found ${processed} sessions to hard-delete`);

    for (const session of sessionsToDelete) {
      try {
        // Hard delete: permanently remove from database
        await prisma.$transaction([
          // Delete related messages first (foreign key constraint)
          prisma.message.deleteMany({
            where: { sessionId: session.id },
          }),
          // Delete the session
          prisma.session.delete({
            where: { id: session.id },
          }),
        ]);

        deleted++;

        // Create audit log (last record before deletion)
        await createAuditLog({
          action: 'SESSION_HARD_DELETED',
          resource: 'Session',
          resourceId: session.id,
          details: {
            reason: 'Grace period expired (30 days after soft delete)',
            softDeletedAt: session.deletedAt,
          },
          tenantId: 'SYSTEM',
          userId: 'SYSTEM',
        });
      } catch (error) {
        const errorMessage = `Failed to hard-delete session ${session.id}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        logger.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    logger.info('Data purge completed', { processed, deleted, errors: errors.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Data purge failed', { error: errorMessage });
    errors.push(errorMessage);
  }

  return { processed, deleted, errors };
}

/**
 * Schedule automated data retention enforcement
 * Should run daily at off-peak hours (e.g., 2 AM)
 */
export function scheduleDataRetention() {
  // Calculate time until next 2 AM
  const now = new Date();
  const next2AM = new Date(now);
  next2AM.setHours(2, 0, 0, 0);

  if (next2AM <= now) {
    // If it's past 2 AM today, schedule for tomorrow
    next2AM.setDate(next2AM.getDate() + 1);
  }

  const msUntil2AM = next2AM.getTime() - now.getTime();

  logger.info('Scheduling daily data retention enforcement', {
    nextRun: next2AM.toISOString(),
    msUntilNextRun: msUntil2AM,
  });

  // Schedule first run
  setTimeout(async () => {
    await enforceDataRetention();

    // Then run daily
    setInterval(
      async () => {
        await enforceDataRetention();
      },
      24 * 60 * 60 * 1000
    ); // Every 24 hours
  }, msUntil2AM);
}

/**
 * Get data retention statistics
 */
export async function getRetentionStatistics() {
  try {
    const stats = {
      sessions: {
        total: await prisma.session.count(),
        softDeleted: await prisma.session.count({
          where: { deletedAt: { not: null } },
        }),
        approachingRetention: await prisma.session.count({
          where: {
            updatedAt: {
              lt: new Date(
                Date.now() - (RETENTION_POLICIES.SESSION_TRANSCRIPTS - 30) * 24 * 60 * 60 * 1000
              ),
            },
            deletedAt: null,
          },
        }),
      },
      assessments: {
        total: await prisma.assessment.count(),
        anonymized: await prisma.assessment.count({
          where: { isAnonymized: true },
        }),
        approachingRetention: await prisma.assessment.count({
          where: {
            createdAt: {
              lt: new Date(
                Date.now() - (RETENTION_POLICIES.ASSESSMENTS - 30) * 24 * 60 * 60 * 1000
              ),
            },
            isAnonymized: false,
          },
        }),
      },
      consents: {
        total: await prisma.user.count({
          where: { isMinor: true },
        }),
        archived: await prisma.user.count({
          where: {
            isMinor: true,
            consentArchived: true,
          },
        }),
      },
      auditLogs: {
        total: await prisma.auditLog.count(),
        archived: await prisma.auditLog.count({
          where: { archived: true },
        }),
      },
    };

    return stats;
  } catch (error) {
    logger.error('Failed to get retention statistics', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
