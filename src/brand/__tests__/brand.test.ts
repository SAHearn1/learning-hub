import { describe, it, expect } from 'vitest';
import { BRAND } from '../brand';

describe('BRAND', () => {
  it('has correct app name', () => {
    expect(BRAND.name).toBe('RootWork');
  });

  it('has a tagline', () => {
    expect(BRAND.tagline).toBe('Grow Your Thinking');
  });

  describe('phases', () => {
    it('defines all 5 R phases', () => {
      const phaseKeys = Object.keys(BRAND.phases);
      expect(phaseKeys).toEqual(['ROOT', 'REGULATE', 'REFLECT', 'RESTORE', 'RECONNECT']);
    });

    it('each phase has name, description, action, icon, and cssVar', () => {
      for (const phase of Object.values(BRAND.phases)) {
        expect(phase.name).toBeTruthy();
        expect(phase.description).toBeTruthy();
        expect(phase.action).toBeTruthy();
        expect(phase.icon).toBeTruthy();
        expect(phase.cssVar).toMatch(/^--phase-/);
      }
    });
  });

  describe('subjects', () => {
    it('defines 4 subjects', () => {
      expect(Object.keys(BRAND.subjects)).toEqual(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']);
    });

    it('each subject has name, shortName, icon, and color', () => {
      for (const subject of Object.values(BRAND.subjects)) {
        expect(subject.name).toBeTruthy();
        expect(subject.shortName).toBeTruthy();
        expect(subject.icon).toBeTruthy();
        expect(subject.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe('engagementModes', () => {
    it('defines 5 engagement modes', () => {
      const modes = Object.keys(BRAND.engagementModes);
      expect(modes).toEqual([
        'FORWARD',
        'REVERSE',
        'ERROR_ANALYSIS',
        'MULTIPLE_PATHWAYS',
        'PROBLEM_POSING',
      ]);
    });

    it('each mode has name and icon', () => {
      for (const mode of Object.values(BRAND.engagementModes)) {
        expect(mode.name).toBeTruthy();
        expect(mode.icon).toBeTruthy();
      }
    });
  });
});
