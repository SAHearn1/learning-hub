/**
 * Evaluation Timeline Engine
 *
 * Calculates due dates and checks timeline compliance based on
 * federal or state-specific rules.
 */

import type { StateOverlay, TimelineUnit } from '@/types/evaluation';

export type TimelineStatus = {
  onTrack: boolean;
  daysRemaining: number;
  overdueBy: number;
  dueDate: string;
  consentDate: string;
  timelineDays: number;
  timelineUnit: TimelineUnit;
  stateCode: string;
};

/**
 * Calculate the due date for completing an evaluation.
 *
 * For CALENDAR_DAYS: straightforward date addition.
 * For SCHOOL_DAYS: approximation using a 5/7 ratio
 * (production would use a school calendar lookup).
 */
export function calculateDueDate(
  fromDate: string,
  days: number,
  unit: TimelineUnit,
): string {
  const start = new Date(fromDate);

  if (unit === 'CALENDAR_DAYS') {
    const due = new Date(start.getTime() + days * 86_400_000);
    return due.toISOString();
  }

  // SCHOOL_DAYS: approximate by expanding school days to calendar days
  // assuming 5 school days per 7 calendar days
  const calendarDays = Math.ceil(days * (7 / 5));
  const due = new Date(start.getTime() + calendarDays * 86_400_000);
  return due.toISOString();
}

/**
 * Check whether an evaluation case is on-track, and by how many days
 * it is ahead or overdue.
 */
export function checkTimelineCompliance(
  consentDate: string,
  overlay: StateOverlay,
  nowDate: string,
): TimelineStatus {
  const dueDate = calculateDueDate(
    consentDate,
    overlay.evaluationTimelineDays,
    overlay.evaluationTimelineUnit,
  );

  const now = new Date(nowDate).getTime();
  const due = new Date(dueDate).getTime();
  const msPerDay = 86_400_000;

  const diffDays = Math.floor((due - now) / msPerDay);
  const onTrack = diffDays >= 0;

  return {
    onTrack,
    daysRemaining: Math.max(0, diffDays),
    overdueBy: Math.max(0, -diffDays),
    dueDate,
    consentDate,
    timelineDays: overlay.evaluationTimelineDays,
    timelineUnit: overlay.evaluationTimelineUnit,
    stateCode: overlay.stateCode,
  };
}
