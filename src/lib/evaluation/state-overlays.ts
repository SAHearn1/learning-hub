/**
 * State Overlays — Jurisdiction-Specific Evaluation Timeline Rules
 *
 * Each overlay defines evaluation timeline, unit, and additional meeting roles.
 * The federal baseline (US) is the floor — state overlays can only tighten, not loosen.
 */

import type { StateOverlay } from '@/types/evaluation';

/** Federal baseline — 60 calendar days. */
export const US_FEDERAL: StateOverlay = {
  stateCode: 'US',
  stateName: 'Federal Baseline',
  evaluationTimelineDays: 60,
  evaluationTimelineUnit: 'CALENDAR_DAYS',
  additionalRequiredMeetingRoles: [],
};

/** Georgia — 60 calendar days (matches federal). */
export const GA_OVERLAY: StateOverlay = {
  stateCode: 'GA',
  stateName: 'Georgia',
  evaluationTimelineDays: 60,
  evaluationTimelineUnit: 'CALENDAR_DAYS',
  additionalRequiredMeetingRoles: [],
};

/** Florida — 60 school days (stricter unit). */
export const FL_OVERLAY: StateOverlay = {
  stateCode: 'FL',
  stateName: 'Florida',
  evaluationTimelineDays: 60,
  evaluationTimelineUnit: 'SCHOOL_DAYS',
  additionalRequiredMeetingRoles: [],
};

/** South Carolina — 60 calendar days. */
export const SC_OVERLAY: StateOverlay = {
  stateCode: 'SC',
  stateName: 'South Carolina',
  evaluationTimelineDays: 60,
  evaluationTimelineUnit: 'CALENDAR_DAYS',
  additionalRequiredMeetingRoles: [],
};

/** Louisiana — 60 school days, requires school psychologist. */
export const LA_OVERLAY: StateOverlay = {
  stateCode: 'LA',
  stateName: 'Louisiana',
  evaluationTimelineDays: 60,
  evaluationTimelineUnit: 'SCHOOL_DAYS',
  additionalRequiredMeetingRoles: ['SCHOOL_PSYCHOLOGIST'],
};

/** Registry of all overlays keyed by state code. */
export const STATE_OVERLAYS: Record<string, StateOverlay> = {
  US: US_FEDERAL,
  GA: GA_OVERLAY,
  FL: FL_OVERLAY,
  SC: SC_OVERLAY,
  LA: LA_OVERLAY,
};

/** Look up overlay by state code, falling back to federal baseline. */
export function getOverlay(stateCode: string): StateOverlay {
  return STATE_OVERLAYS[stateCode] ?? US_FEDERAL;
}
