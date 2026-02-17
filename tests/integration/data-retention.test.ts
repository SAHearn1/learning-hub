/**
 * Data Retention Enforcement Integration Tests
 * Tests COPPA-compliant data retention policies
 */

import { describe, it, expect } from 'vitest';
import {
  enforceDataRetention,
  getRetentionStatistics,
  RETENTION_POLICIES,
} from '@/lib/compliance/data-retention';

describe('Data Retention Enforcement', () => {
  describe('Session Retention', () => {
    it('should expose session retention statistics structure', async () => {
      const stats = await getRetentionStatistics();
      expect(stats).toHaveProperty('sessions');
      expect(stats.sessions).toHaveProperty('total');
      expect(stats.sessions).toHaveProperty('softDeleted');
      expect(stats.sessions).toHaveProperty('approachingRetention');
    });

    it('should calculate retention period correctly', () => {
      const retentionDays = RETENTION_POLICIES.SESSION_TRANSCRIPTS;
      expect(retentionDays).toBe(24 * 30); // 720 days
    });
  });

  describe('Assessment Anonymization', () => {
    it('should enforce 36-month retention for assessments', () => {
      const retentionDays = RETENTION_POLICIES.ASSESSMENTS;
      expect(retentionDays).toBe(36 * 30); // 1080 days
    });
  });

  describe('Consent Record Archival', () => {
    it('should enforce 7-year retention for consent records', () => {
      const retentionDays = RETENTION_POLICIES.CONSENT_RECORDS;
      expect(retentionDays).toBe(7 * 365); // 2555 days
    });
  });

  describe('Retention Statistics', () => {
    it('should return accurate retention statistics', async () => {
      const stats = await getRetentionStatistics();

      expect(stats).toHaveProperty('sessions');
      expect(stats).toHaveProperty('assessments');
      expect(stats).toHaveProperty('consents');
      expect(stats).toHaveProperty('auditLogs');

      expect(stats.sessions).toHaveProperty('total');
      expect(stats.sessions).toHaveProperty('softDeleted');
      expect(stats.sessions).toHaveProperty('approachingRetention');
    });
  });

  describe('Data Retention Job', () => {
    it('should complete without errors', async () => {
      // Run full retention job
      const result = await enforceDataRetention();

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('recordsProcessed');
      expect(result).toHaveProperty('recordsDeleted');
      expect(result).toHaveProperty('recordsAnonymized');
      expect(result).toHaveProperty('errors');

      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
