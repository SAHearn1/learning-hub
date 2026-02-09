/**
 * Monitoring & Alerting Integration Tests
 * Tests metrics collection and alert triggering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  metricsStore,
  trackHttpRequest,
  trackAIUsage,
  trackDatabaseQuery,
  trackCacheOperation,
  trackConcurrentUsers,
  exportMetrics,
} from '@/lib/monitoring/metrics';
import { alertRules, checkAlertCondition } from '@/lib/monitoring/alerts';

describe('Monitoring & Alerting', () => {
  beforeEach(() => {
    // Clear metrics before each test
    metricsStore.clear();
  });

  describe('HTTP Request Tracking', () => {
    it('should track successful HTTP requests', () => {
      trackHttpRequest('/api/chat', 'POST', 200, 250);

      const metrics = exportMetrics();
      expect(metrics.httpRequestCount).toBeGreaterThan(0);
    });

    it('should track failed HTTP requests', () => {
      trackHttpRequest('/api/chat', 'POST', 500, 100);

      const metrics = exportMetrics();
      expect(metrics.httpErrorRate).toBeGreaterThan(0);
    });

    it('should calculate error rate correctly', () => {
      // 9 successful requests
      for (let i = 0; i < 9; i++) {
        trackHttpRequest('/api/test', 'GET', 200, 100);
      }

      // 1 failed request
      trackHttpRequest('/api/test', 'GET', 500, 100);

      const metrics = exportMetrics();
      expect(metrics.httpErrorRate).toBeCloseTo(0.1, 2); // 10% error rate
    });
  });

  describe('AI Usage Tracking', () => {
    it('should track AI API calls', () => {
      trackAIUsage('anthropic', 'claude-3-5-sonnet', 1500, 2000, 0.012, 1850, true);

      const metrics = exportMetrics();
      expect(metrics.aiRequestCount).toBeGreaterThan(0);
    });

    it('should track AI costs', () => {
      trackAIUsage('anthropic', 'claude-3-5-sonnet', 1500, 2000, 10.5, 1850, true);

      const metrics = exportMetrics();
      expect(metrics.aiCostPerHour).toBeGreaterThan(0);
    });

    it('should track AI error rate', () => {
      // 3 successful calls
      for (let i = 0; i < 3; i++) {
        trackAIUsage('anthropic', 'claude-3-5-sonnet', 1000, 1000, 0.01, 1000, true);
      }

      // 1 failed call
      trackAIUsage('anthropic', 'claude-3-5-sonnet', 1000, 1000, 0.01, 1000, false);

      const metrics = exportMetrics();
      expect(metrics.aiErrorRate).toBeCloseTo(0.25, 2); // 25% error rate
    });
  });

  describe('Database Query Tracking', () => {
    it('should track database queries', () => {
      trackDatabaseQuery('select', 'Session', 45, true);

      const metrics = exportMetrics();
      expect(metrics.databaseQueryCount).toBeGreaterThan(0);
    });

    it('should track database errors', () => {
      trackDatabaseQuery('select', 'Session', 45, false);

      const metrics = exportMetrics();
      expect(metrics.databaseErrorRate).toBeGreaterThan(0);
    });
  });

  describe('Cache Operation Tracking', () => {
    it('should track cache hits', () => {
      trackCacheOperation('get', true, 5);

      const metrics = exportMetrics();
      expect(metrics.cacheMissRate).toBeLessThan(1);
    });

    it('should track cache misses', () => {
      trackCacheOperation('get', false, 5);

      const metrics = exportMetrics();
      expect(metrics.cacheMissRate).toBeGreaterThan(0);
    });

    it('should calculate cache miss rate correctly', () => {
      // 7 hits
      for (let i = 0; i < 7; i++) {
        trackCacheOperation('get', true, 5);
      }

      // 3 misses
      for (let i = 0; i < 3; i++) {
        trackCacheOperation('get', false, 10);
      }

      const metrics = exportMetrics();
      expect(metrics.cacheMissRate).toBeCloseTo(0.3, 2); // 30% miss rate
    });
  });

  describe('Concurrent Users Tracking', () => {
    it('should track concurrent users', () => {
      trackConcurrentUsers(87);

      const metrics = exportMetrics();
      expect(metrics.concurrentUsers).toBe(87);
    });

    it('should update concurrent users', () => {
      trackConcurrentUsers(50);
      trackConcurrentUsers(75);
      trackConcurrentUsers(100);

      const metrics = exportMetrics();
      expect(metrics.concurrentUsers).toBe(100); // Latest value
    });
  });

  describe('Alert Rules', () => {
    it('should have defined alert rules', () => {
      expect(alertRules.length).toBeGreaterThan(0);
    });

    it('should have critical error rate alert', () => {
      const errorRateAlert = alertRules.find((a) => a.id === 'error-rate-critical');
      expect(errorRateAlert).toBeDefined();
      expect(errorRateAlert?.severity).toBe('critical');
    });

    it('should have concurrent users capacity alert', () => {
      const capacityAlert = alertRules.find((a) => a.id === 'concurrent-users-approaching-limit');
      expect(capacityAlert).toBeDefined();
      expect(capacityAlert?.condition.threshold).toBe(90);
    });
  });

  describe('Alert Condition Checking', () => {
    it('should trigger alert when threshold exceeded', () => {
      const alert = alertRules.find((a) => a.id === 'error-rate-critical');
      if (!alert) throw new Error('Alert not found');

      const shouldAlert = checkAlertCondition(alert, 0.08); // 8% error rate
      expect(shouldAlert).toBe(true);
    });

    it('should not trigger alert when below threshold', () => {
      const alert = alertRules.find((a) => a.id === 'error-rate-critical');
      if (!alert) throw new Error('Alert not found');

      const shouldAlert = checkAlertCondition(alert, 0.02); // 2% error rate
      expect(shouldAlert).toBe(false);
    });

    it('should handle different operators', () => {
      const gtAlert = { condition: { operator: '>' as const, threshold: 100 } };
      expect(checkAlertCondition(gtAlert as any, 150)).toBe(true);
      expect(checkAlertCondition(gtAlert as any, 50)).toBe(false);

      const ltAlert = { condition: { operator: '<' as const, threshold: 100 } };
      expect(checkAlertCondition(ltAlert as any, 50)).toBe(true);
      expect(checkAlertCondition(ltAlert as any, 150)).toBe(false);
    });
  });

  describe('Metrics Export', () => {
    it('should export all metrics', () => {
      // Track various metrics
      trackHttpRequest('/api/test', 'GET', 200, 100);
      trackAIUsage('anthropic', 'claude-3-5-sonnet', 1000, 1000, 0.01, 1000, true);
      trackDatabaseQuery('select', 'User', 20, true);
      trackCacheOperation('get', true, 5);
      trackConcurrentUsers(50);

      const metrics = exportMetrics();

      expect(metrics).toHaveProperty('httpRequestCount');
      expect(metrics).toHaveProperty('httpErrorRate');
      expect(metrics).toHaveProperty('aiRequestCount');
      expect(metrics).toHaveProperty('databaseQueryCount');
      expect(metrics).toHaveProperty('cacheMissRate');
      expect(metrics).toHaveProperty('concurrentUsers');
    });
  });
});
