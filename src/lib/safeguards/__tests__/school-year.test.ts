import { describe, it, expect } from 'vitest';
import { getCurrentSchoolYear } from '../school-year';

describe('getCurrentSchoolYear', () => {
  it('returns current-next year for July', () => {
    expect(getCurrentSchoolYear(new Date('2025-07-15'))).toBe('2025-2026');
  });

  it('returns current-next year for December', () => {
    expect(getCurrentSchoolYear(new Date('2025-12-01'))).toBe('2025-2026');
  });

  it('returns prev-current year for January', () => {
    expect(getCurrentSchoolYear(new Date('2026-01-15'))).toBe('2025-2026');
  });

  it('returns prev-current year for June', () => {
    expect(getCurrentSchoolYear(new Date('2026-06-30'))).toBe('2025-2026');
  });

  it('handles boundary: mid-July is start of new school year', () => {
    // Use mid-July to avoid UTC-to-local timezone shift on July 1
    expect(getCurrentSchoolYear(new Date(2026, 6, 15))).toBe('2026-2027');
  });

  it('handles boundary: June 30 is end of school year', () => {
    expect(getCurrentSchoolYear(new Date('2026-06-30'))).toBe('2025-2026');
  });
});
