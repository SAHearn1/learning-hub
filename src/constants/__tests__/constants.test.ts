import { describe, it, expect } from 'vitest';
import { GRADE_LEVELS } from '../grade-levels';
import { REGULATION_LEVELS, DYSREGULATION_SIGNALS } from '../regulation-states';
import { ROLES } from '../roles';
import { SUBJECTS } from '../subjects';

describe('GRADE_LEVELS', () => {
  it('has 12 grade levels', () => {
    expect(GRADE_LEVELS).toHaveLength(12);
  });

  it('grades 1-5 are Elementary', () => {
    const elementary = GRADE_LEVELS.filter((g) => g.group === 'Elementary');
    expect(elementary).toHaveLength(5);
    expect(elementary.map((g) => g.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it('grades 6-8 are Middle School', () => {
    const middle = GRADE_LEVELS.filter((g) => g.group === 'Middle School');
    expect(middle).toHaveLength(3);
    expect(middle.map((g) => g.value)).toEqual([6, 7, 8]);
  });

  it('grades 9-12 are High School', () => {
    const high = GRADE_LEVELS.filter((g) => g.group === 'High School');
    expect(high).toHaveLength(4);
    expect(high.map((g) => g.value)).toEqual([9, 10, 11, 12]);
  });

  it('all entries have value, label, and group', () => {
    for (const level of GRADE_LEVELS) {
      expect(level).toHaveProperty('value');
      expect(level).toHaveProperty('label');
      expect(level).toHaveProperty('group');
    }
  });
});

describe('REGULATION_LEVELS', () => {
  it('defines 5 regulation tiers', () => {
    expect(Object.keys(REGULATION_LEVELS)).toHaveLength(5);
  });

  it('covers the full 0-100 range without gaps', () => {
    const ranges = Object.values(REGULATION_LEVELS);
    const sorted = [...ranges].sort((a, b) => a.min - b.min);

    expect(sorted[0].min).toBe(0);
    expect(sorted[sorted.length - 1].max).toBe(100);

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].min).toBe(sorted[i - 1].max + 1);
    }
  });

  it('CRISIS is 0-20', () => {
    expect(REGULATION_LEVELS.CRISIS.min).toBe(0);
    expect(REGULATION_LEVELS.CRISIS.max).toBe(20);
  });

  it('OPTIMAL is 81-100', () => {
    expect(REGULATION_LEVELS.OPTIMAL.min).toBe(81);
    expect(REGULATION_LEVELS.OPTIMAL.max).toBe(100);
  });

  it('all levels have label and action', () => {
    for (const level of Object.values(REGULATION_LEVELS)) {
      expect(level.label).toBeTruthy();
      expect(level.action).toBeTruthy();
    }
  });
});

describe('DYSREGULATION_SIGNALS', () => {
  it('has 8 signal types', () => {
    expect(DYSREGULATION_SIGNALS).toHaveLength(8);
  });

  it('includes known behavioral signals', () => {
    expect(DYSREGULATION_SIGNALS).toContain('negative_self_talk');
    expect(DYSREGULATION_SIGNALS).toContain('all_caps');
    expect(DYSREGULATION_SIGNALS).toContain('avoidance_behavior');
    expect(SUBJECTS.FINANCIAL_LITERACY).toBe('FINANCIAL_LITERACY');
  });
});

describe('ROLES', () => {
  it('defines 6 roles', () => {
    expect(Object.keys(ROLES)).toHaveLength(6);
  });

  it('includes all expected role types', () => {
    expect(ROLES.STUDENT).toBe('STUDENT');
    expect(ROLES.EDUCATOR).toBe('EDUCATOR');
    expect(ROLES.PARENT).toBe('PARENT');
    expect(ROLES.SCHOOL_ADMIN).toBe('SCHOOL_ADMIN');
    expect(ROLES.DISTRICT_ADMIN).toBe('DISTRICT_ADMIN');
    expect(ROLES.PLATFORM_ADMIN).toBe('PLATFORM_ADMIN');
    expect(SUBJECTS.FINANCIAL_LITERACY).toBe('FINANCIAL_LITERACY');
  });
});

describe('SUBJECTS', () => {
  it('defines 4 subjects', () => {
    expect(Object.keys(SUBJECTS)).toHaveLength(4);
  });

  it('includes MATH, SCIENCE, LANGUAGE_ARTS, and FINANCIAL_LITERACY', () => {
    expect(SUBJECTS.MATH).toBe('MATH');
    expect(SUBJECTS.SCIENCE).toBe('SCIENCE');
    expect(SUBJECTS.LANGUAGE_ARTS).toBe('LANGUAGE_ARTS');
    expect(SUBJECTS.FINANCIAL_LITERACY).toBe('FINANCIAL_LITERACY');
  });
});
