/**
 * School Year Utility
 *
 * Returns the current school year string in "YYYY-YYYY" format
 * based on a July 1 boundary (standard US fiscal/school year).
 */

export function getCurrentSchoolYear(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0=Jan … 6=Jul

  // July (6) through December (11) → current year – next year
  // January (0) through June (5) → previous year – current year
  if (month >= 6) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}
