import { describe, it, expect } from 'vitest';
import {
  US_FEDERAL,
  GA_OVERLAY,
  FL_OVERLAY,
  SC_OVERLAY,
  LA_OVERLAY,
  STATE_OVERLAYS,
  getOverlay,
} from '../state-overlays';
import {
  validateOverlay,
  validateAllOverlays,
} from '../overlay-invariant';
import type { StateOverlay } from '@/types/evaluation';

// ─── State Overlays ─────────────────────────────────────────────────────────

describe('State Overlays', () => {
  it('US_FEDERAL has 60 calendar days', () => {
    expect(US_FEDERAL.evaluationTimelineDays).toBe(60);
    expect(US_FEDERAL.evaluationTimelineUnit).toBe('CALENDAR_DAYS');
    expect(US_FEDERAL.additionalRequiredMeetingRoles).toHaveLength(0);
  });

  it('GA matches federal baseline', () => {
    expect(GA_OVERLAY.evaluationTimelineDays).toBe(60);
    expect(GA_OVERLAY.evaluationTimelineUnit).toBe('CALENDAR_DAYS');
  });

  it('FL uses school days', () => {
    expect(FL_OVERLAY.evaluationTimelineUnit).toBe('SCHOOL_DAYS');
    expect(FL_OVERLAY.evaluationTimelineDays).toBe(60);
  });

  it('SC matches federal baseline', () => {
    expect(SC_OVERLAY.evaluationTimelineDays).toBe(60);
    expect(SC_OVERLAY.evaluationTimelineUnit).toBe('CALENDAR_DAYS');
  });

  it('LA uses school days and requires SCHOOL_PSYCHOLOGIST', () => {
    expect(LA_OVERLAY.evaluationTimelineUnit).toBe('SCHOOL_DAYS');
    expect(LA_OVERLAY.additionalRequiredMeetingRoles).toContain('SCHOOL_PSYCHOLOGIST');
  });

  it('STATE_OVERLAYS contains all 5 overlays', () => {
    expect(Object.keys(STATE_OVERLAYS)).toHaveLength(5);
    expect(STATE_OVERLAYS).toHaveProperty('US');
    expect(STATE_OVERLAYS).toHaveProperty('GA');
    expect(STATE_OVERLAYS).toHaveProperty('FL');
    expect(STATE_OVERLAYS).toHaveProperty('SC');
    expect(STATE_OVERLAYS).toHaveProperty('LA');
  });
});

// ─── getOverlay ─────────────────────────────────────────────────────────────

describe('getOverlay', () => {
  it('returns correct overlay for known state code', () => {
    expect(getOverlay('FL')).toBe(FL_OVERLAY);
    expect(getOverlay('GA')).toBe(GA_OVERLAY);
    expect(getOverlay('LA')).toBe(LA_OVERLAY);
  });

  it('falls back to US_FEDERAL for unknown state code', () => {
    expect(getOverlay('TX')).toBe(US_FEDERAL);
    expect(getOverlay('')).toBe(US_FEDERAL);
  });
});

// ─── Overlay Invariant ──────────────────────────────────────────────────────

describe('validateOverlay', () => {
  it('returns no violations for GA (matches federal)', () => {
    const violations = validateOverlay(GA_OVERLAY, US_FEDERAL);
    expect(violations).toHaveLength(0);
  });

  it('returns no violations for FL (school days is stricter)', () => {
    const violations = validateOverlay(FL_OVERLAY, US_FEDERAL);
    expect(violations).toHaveLength(0);
  });

  it('returns no violations for LA (school days + extra role)', () => {
    const violations = validateOverlay(LA_OVERLAY, US_FEDERAL);
    expect(violations).toHaveLength(0);
  });

  it('rejects overlay with more timeline days than federal', () => {
    const badOverlay: StateOverlay = {
      stateCode: 'BAD',
      stateName: 'Bad State',
      evaluationTimelineDays: 90,
      evaluationTimelineUnit: 'CALENDAR_DAYS',
      additionalRequiredMeetingRoles: [],
    };
    const violations = validateOverlay(badOverlay, US_FEDERAL);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].field).toBe('evaluationTimelineDays');
    expect(violations[0].message).toContain('90');
  });

  it('rejects overlay missing baseline required roles', () => {
    const baseline: StateOverlay = {
      ...US_FEDERAL,
      additionalRequiredMeetingRoles: ['SPECIAL_ROLE'],
    };
    const overlay: StateOverlay = {
      stateCode: 'TEST',
      stateName: 'Test',
      evaluationTimelineDays: 60,
      evaluationTimelineUnit: 'CALENDAR_DAYS',
      additionalRequiredMeetingRoles: [],
    };
    const violations = validateOverlay(overlay, baseline);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].field).toBe('additionalRequiredMeetingRoles');
  });

  it('accepts overlay with fewer days than federal', () => {
    const strict: StateOverlay = {
      stateCode: 'STRICT',
      stateName: 'Strict State',
      evaluationTimelineDays: 45,
      evaluationTimelineUnit: 'CALENDAR_DAYS',
      additionalRequiredMeetingRoles: [],
    };
    expect(validateOverlay(strict, US_FEDERAL)).toHaveLength(0);
  });
});

// ─── validateAllOverlays ────────────────────────────────────────────────────

describe('validateAllOverlays', () => {
  it('all built-in overlays pass validation', () => {
    const result = validateAllOverlays(STATE_OVERLAYS, US_FEDERAL);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('reports violations for invalid overlay in set', () => {
    const overlays = {
      ...STATE_OVERLAYS,
      XX: {
        stateCode: 'XX',
        stateName: 'Invalid',
        evaluationTimelineDays: 120,
        evaluationTimelineUnit: 'CALENDAR_DAYS' as const,
        additionalRequiredMeetingRoles: [],
      },
    };
    const result = validateAllOverlays(overlays, US_FEDERAL);
    expect(result).toHaveProperty('XX');
    expect(result.XX.length).toBeGreaterThan(0);
  });

  it('skips baseline stateCode', () => {
    // US should not be validated against itself
    const result = validateAllOverlays({ US: US_FEDERAL }, US_FEDERAL);
    expect(Object.keys(result)).toHaveLength(0);
  });
});
