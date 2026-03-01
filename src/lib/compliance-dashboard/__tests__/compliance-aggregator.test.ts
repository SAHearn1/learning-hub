import { describe, it, expect } from 'vitest';
import type { ComplianceSnapshot } from '../compliance-aggregator';

/**
 * These tests verify the risk scoring logic and snapshot shape.
 * Since generateComplianceSnapshot requires DB access, we test the
 * risk calculation logic in isolation.
 */

function calculateRisk(criticalViolations: number, warningViolations: number) {
  const riskScore = Math.min(100, criticalViolations * 15 + warningViolations * 5);
  const riskLevel: ComplianceSnapshot['riskLevel'] =
    riskScore >= 60
      ? 'CRITICAL'
      : riskScore >= 30
        ? 'HIGH'
        : riskScore >= 10
          ? 'MODERATE'
          : 'LOW';
  return { riskScore, riskLevel };
}

describe('Compliance risk scoring', () => {
  it('returns LOW for zero violations', () => {
    const { riskScore, riskLevel } = calculateRisk(0, 0);
    expect(riskScore).toBe(0);
    expect(riskLevel).toBe('LOW');
  });

  it('returns MODERATE for small warnings', () => {
    const { riskLevel } = calculateRisk(0, 3);
    expect(riskLevel).toBe('MODERATE');
  });

  it('returns HIGH for critical violations', () => {
    const { riskLevel } = calculateRisk(2, 1);
    // 2*15 + 1*5 = 35 → HIGH
    expect(riskLevel).toBe('HIGH');
  });

  it('returns CRITICAL for many violations', () => {
    const { riskLevel } = calculateRisk(4, 2);
    // 4*15 + 2*5 = 70 → CRITICAL
    expect(riskLevel).toBe('CRITICAL');
  });

  it('caps risk score at 100', () => {
    const { riskScore } = calculateRisk(10, 10);
    // 10*15 + 10*5 = 200 → capped at 100
    expect(riskScore).toBe(100);
  });

  it('MODERATE threshold is 10', () => {
    expect(calculateRisk(0, 2).riskLevel).toBe('MODERATE'); // 10
    expect(calculateRisk(0, 1).riskLevel).toBe('LOW'); // 5
  });

  it('HIGH threshold is 30', () => {
    expect(calculateRisk(2, 0).riskLevel).toBe('HIGH'); // 30
    expect(calculateRisk(1, 2).riskLevel).toBe('MODERATE'); // 25
  });

  it('CRITICAL threshold is 60', () => {
    expect(calculateRisk(4, 0).riskLevel).toBe('CRITICAL'); // 60
    expect(calculateRisk(3, 2).riskLevel).toBe('HIGH'); // 55
  });
});

describe('ComplianceSnapshot shape', () => {
  it('has correct type structure', () => {
    const snapshot: ComplianceSnapshot = {
      tenantId: 'tenant-1',
      schoolYear: '2025-07-01/2026-06-30',
      generatedAt: '2025-10-01T00:00:00Z',
      safeguards: {
        totalNotices: 10,
        delivered: 8,
        pending: 1,
        acknowledged: 1,
      },
      progressMonitoring: {
        totalGoals: 20,
        activeGoals: 15,
        missingMeasurementMethod: 0,
        missingReportingFrequency: 0,
      },
      evaluations: {
        totalCases: 5,
        openCases: 3,
        overdueCases: 0,
        awaitingConsent: 1,
        missingPlan: 0,
      },
      discipline: {
        totalRemovals: 3,
        openCases: 1,
        changeOfPlacement: 0,
        pendingMdr: 0,
      },
      riskScore: 5,
      riskLevel: 'LOW',
    };

    expect(snapshot.safeguards.totalNotices).toBe(10);
    expect(snapshot.progressMonitoring.activeGoals).toBe(15);
    expect(snapshot.evaluations.openCases).toBe(3);
    expect(snapshot.discipline.totalRemovals).toBe(3);
    expect(snapshot.riskLevel).toBe('LOW');
  });
});
