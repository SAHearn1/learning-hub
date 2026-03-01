import { describe, it, expect } from 'vitest';
import { calculateDueDate, checkTimelineCompliance } from '../timeline-engine';
import type { StateOverlay } from '@/types/evaluation';

// ─── Helpers ────────────────────────────────────────────────────────────────

const federalOverlay: StateOverlay = {
  stateCode: 'US',
  stateName: 'Federal Baseline',
  evaluationTimelineDays: 60,
  evaluationTimelineUnit: 'CALENDAR_DAYS',
  additionalRequiredMeetingRoles: [],
};

const schoolDayOverlay: StateOverlay = {
  stateCode: 'FL',
  stateName: 'Florida',
  evaluationTimelineDays: 60,
  evaluationTimelineUnit: 'SCHOOL_DAYS',
  additionalRequiredMeetingRoles: [],
};

// ─── calculateDueDate ───────────────────────────────────────────────────────

describe('calculateDueDate', () => {
  it('adds calendar days correctly', () => {
    const result = calculateDueDate('2025-09-01T00:00:00Z', 60, 'CALENDAR_DAYS');
    const due = new Date(result);
    // Sep 1 + 60 days = Oct 31
    expect(due.getUTCMonth()).toBe(9); // October (0-indexed)
    expect(due.getUTCDate()).toBe(31);
  });

  it('adds 0 days returns same date', () => {
    const result = calculateDueDate('2025-09-15T00:00:00Z', 0, 'CALENDAR_DAYS');
    expect(new Date(result).toISOString()).toBe('2025-09-15T00:00:00.000Z');
  });

  it('handles year boundary', () => {
    const result = calculateDueDate('2025-12-01T00:00:00Z', 60, 'CALENDAR_DAYS');
    const due = new Date(result);
    expect(due.getUTCFullYear()).toBe(2026);
    expect(due.getUTCMonth()).toBe(0); // January
    expect(due.getUTCDate()).toBe(30);
  });

  it('approximates school days using 7/5 ratio', () => {
    const result = calculateDueDate('2025-09-01T00:00:00Z', 60, 'SCHOOL_DAYS');
    const due = new Date(result);
    // 60 school days × (7/5) = 84 calendar days
    const expected = new Date('2025-09-01T00:00:00Z');
    expected.setUTCDate(expected.getUTCDate() + 84);
    expect(due.getUTCDate()).toBe(expected.getUTCDate());
    expect(due.getUTCMonth()).toBe(expected.getUTCMonth());
  });

  it('school days result is later than calendar days result', () => {
    const calResult = calculateDueDate('2025-09-01T00:00:00Z', 60, 'CALENDAR_DAYS');
    const schoolResult = calculateDueDate('2025-09-01T00:00:00Z', 60, 'SCHOOL_DAYS');
    expect(new Date(schoolResult).getTime()).toBeGreaterThan(new Date(calResult).getTime());
  });

  it('returns ISO string format', () => {
    const result = calculateDueDate('2025-09-01T00:00:00Z', 30, 'CALENDAR_DAYS');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── checkTimelineCompliance ────────────────────────────────────────────────

describe('checkTimelineCompliance', () => {
  it('returns onTrack when within timeline', () => {
    const status = checkTimelineCompliance(
      '2025-09-01T00:00:00Z',
      federalOverlay,
      '2025-09-15T00:00:00Z',
    );
    expect(status.onTrack).toBe(true);
    expect(status.daysRemaining).toBeGreaterThan(0);
    expect(status.overdueBy).toBe(0);
  });

  it('returns overdue when past timeline', () => {
    const status = checkTimelineCompliance(
      '2025-06-01T00:00:00Z',
      federalOverlay,
      '2025-10-01T00:00:00Z',
    );
    expect(status.onTrack).toBe(false);
    expect(status.overdueBy).toBeGreaterThan(0);
    expect(status.daysRemaining).toBe(0);
  });

  it('returns onTrack at exactly the due date', () => {
    // Sep 1 + 60 calendar days = Oct 31
    const status = checkTimelineCompliance(
      '2025-09-01T00:00:00Z',
      federalOverlay,
      '2025-10-31T00:00:00Z',
    );
    expect(status.onTrack).toBe(true);
    expect(status.daysRemaining).toBe(0);
  });

  it('uses school day overlay timeline', () => {
    const status = checkTimelineCompliance(
      '2025-09-01T00:00:00Z',
      schoolDayOverlay,
      '2025-11-01T00:00:00Z',
    );
    // 60 school days ≈ 84 calendar days, so Nov 1 (61 cal days) should be on track
    expect(status.onTrack).toBe(true);
    expect(status.timelineUnit).toBe('SCHOOL_DAYS');
  });

  it('includes metadata in result', () => {
    const status = checkTimelineCompliance(
      '2025-09-01T00:00:00Z',
      federalOverlay,
      '2025-09-15T00:00:00Z',
    );
    expect(status.consentDate).toBe('2025-09-01T00:00:00Z');
    expect(status.timelineDays).toBe(60);
    expect(status.timelineUnit).toBe('CALENDAR_DAYS');
    expect(status.stateCode).toBe('US');
    expect(status.dueDate).toBeTruthy();
  });

  it('overdue count is accurate', () => {
    // Jun 1 + 60 cal days = Jul 31. Now = Oct 1 → 62 days overdue
    const status = checkTimelineCompliance(
      '2025-06-01T00:00:00Z',
      federalOverlay,
      '2025-10-01T00:00:00Z',
    );
    expect(status.overdueBy).toBeGreaterThanOrEqual(60);
  });

  it('days remaining decreases over time', () => {
    const early = checkTimelineCompliance(
      '2025-09-01T00:00:00Z', federalOverlay, '2025-09-05T00:00:00Z',
    );
    const later = checkTimelineCompliance(
      '2025-09-01T00:00:00Z', federalOverlay, '2025-09-25T00:00:00Z',
    );
    expect(early.daysRemaining).toBeGreaterThan(later.daysRemaining);
  });
});
