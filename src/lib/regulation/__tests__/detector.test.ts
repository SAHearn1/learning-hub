import { describe, it, expect } from 'vitest';
import { detectDysregulation, updateRegulationLevel } from '../detector';

describe('Regulation Detector', () => {
  describe('detectDysregulation', () => {
    it('should detect minimal engagement pattern', () => {
      const message = 'ok';
      const history = [
        { role: 'USER', content: 'yes', createdAt: new Date() },
        { role: 'USER', content: 'no', createdAt: new Date() },
      ];

      const result = detectDysregulation(message, history);

      expect(result.signals).toContain('minimal_engagement');
      // minimal_engagement is a high priority signal, so with disengagement it becomes high severity
      expect(result.severity).toBe('high');
    });

    it('should detect heightened emotion from excessive punctuation', () => {
      const message = 'What????';
      const history: any[] = [];

      const result = detectDysregulation(message, history);

      expect(result.signals).toContain('heightened_emotion');
    });

    it('should detect negative language', () => {
      const message = "I can't do this";
      const history: any[] = [];

      const result = detectDysregulation(message, history);

      expect(result.signals).toContain('negative_language');
    });

    it('should detect excessive caps', () => {
      const message = 'THIS IS STUPID';
      const history: any[] = [];

      const result = detectDysregulation(message, history);

      expect(result.signals).toContain('excessive_caps');
    });

    it('should recommend calm-corner for high severity', () => {
      const message = "I HATE THIS I CAN'T DO IT!!!!";
      const history: any[] = [];

      const result = detectDysregulation(message, history);

      expect(result.severity).toBe('high');
      expect(result.recommendation).toBe('calm-corner');
    });

    it('should recommend continue for no signals', () => {
      const message = 'I think the answer is 42 because I multiplied 6 by 7';
      const history: any[] = [];

      const result = detectDysregulation(message, history);

      expect(result.signals).toHaveLength(0);
      expect(result.severity).toBe('low');
      expect(result.recommendation).toBe('continue');
    });
  });

  describe('updateRegulationLevel', () => {
    it('should decrease regulation level for high severity', () => {
      const currentLevel = 70;
      const check = {
        signals: ['negative_language', 'excessive_caps'],
        severity: 'high' as const,
        recommendation: 'calm-corner' as const,
      };

      const newLevel = updateRegulationLevel(currentLevel, check);

      expect(newLevel).toBeLessThan(currentLevel);
      expect(newLevel).toBe(55); // 70 - 15
    });

    it('should increase regulation level when no signals', () => {
      const currentLevel = 60;
      const check = {
        signals: [],
        severity: 'low' as const,
        recommendation: 'continue' as const,
      };

      const newLevel = updateRegulationLevel(currentLevel, check);

      expect(newLevel).toBeGreaterThan(currentLevel);
      expect(newLevel).toBe(65); // 60 + 5
    });

    it('should not exceed 100', () => {
      const currentLevel = 98;
      const check = {
        signals: [],
        severity: 'low' as const,
        recommendation: 'continue' as const,
      };

      const newLevel = updateRegulationLevel(currentLevel, check);

      expect(newLevel).toBe(100);
    });

    it('should not go below 0', () => {
      const currentLevel = 10;
      const check = {
        signals: ['negative_language', 'excessive_caps', 'disengagement'],
        severity: 'high' as const,
        recommendation: 'calm-corner' as const,
      };

      const newLevel = updateRegulationLevel(currentLevel, check);

      expect(newLevel).toBe(0);
    });
  });
});
