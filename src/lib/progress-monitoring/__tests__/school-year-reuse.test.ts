import { describe, it, expect } from 'vitest';
import { getCurrentSchoolYear } from '@/lib/safeguards/school-year';

describe('School Year Utility (reuse verification)', () => {
  it('returns correct school year for September', () => {
    const result = getCurrentSchoolYear(new Date('2025-09-15'));
    expect(result).toBe('2025-2026');
  });

  it('returns correct school year for January', () => {
    const result = getCurrentSchoolYear(new Date('2026-01-15'));
    expect(result).toBe('2025-2026');
  });

  it('returns correct school year for July (start of new year)', () => {
    // Use explicit local date to avoid UTC midnight → local timezone shift
    const result = getCurrentSchoolYear(new Date(2025, 6, 1)); // month 6 = July
    expect(result).toBe('2025-2026');
  });

  it('returns correct school year for June (end of year)', () => {
    const result = getCurrentSchoolYear(new Date('2026-06-30'));
    expect(result).toBe('2025-2026');
  });

  it('is importable from safeguards module (shared utility)', () => {
    expect(typeof getCurrentSchoolYear).toBe('function');
  });
});
