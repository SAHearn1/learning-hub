import { describe, it, expect } from 'vitest';
import {
  classifySentiment,
  formatInterventionMessage,
  REGULATION_EXERCISES,
  type SentimentClassification,
} from '../sentiment-classifier';

describe('Sentiment Classifier', () => {
  describe('classifySentiment', () => {
    it('should trigger intervention for acute stress pattern', () => {
      const message = "I'm so stressed I can't think";
      const history: any[] = [];
      const regulationLevel = 70;

      const result = classifySentiment(message, history, regulationLevel);

      expect(result.shouldIntervene).toBe(true);
      expect(result.stressLevel).toBe('high');
      expect(result.detectedPatterns).toContain('distress');
      expect(result.exercise).toBeDefined();
      expect(result.exercise?.title).toBeTruthy();
    });

    it('should NOT trigger intervention for normal academic struggle', () => {
      const message = "I don't understand this problem";
      const history: any[] = [];
      const regulationLevel = 70;

      const result = classifySentiment(message, history, regulationLevel);

      expect(result.shouldIntervene).toBe(false);
      expect(result.stressLevel).toBe('low');
    });

    it('should trigger intervention for cumulative stress (3+ negative messages)', () => {
      const message = 'This is confusing';
      const history = [
        { role: 'USER', content: "I can't do this", createdAt: new Date() },
        { role: 'USER', content: "I'm stupid", createdAt: new Date() },
        { role: 'USER', content: 'I hate math', createdAt: new Date() },
      ];
      const regulationLevel = 70;

      const result = classifySentiment(message, history, regulationLevel);

      expect(result.shouldIntervene).toBe(true);
      expect(result.stressLevel).toBe('high');
      expect(result.reasoning).toContain('Multiple stress signals');
    });

    it('should trigger intervention for crisis-level regulation (< 30)', () => {
      const message = 'What is 2 + 2?';
      const history: any[] = [];
      const regulationLevel = 25;

      const result = classifySentiment(message, history, regulationLevel);

      expect(result.shouldIntervene).toBe(true);
      expect(result.stressLevel).toBe('crisis');
      expect(result.detectedPatterns).toContain('critical_regulation_level');
    });

    it('should detect crisis language and trigger immediate intervention', () => {
      const message = 'I want to give up';
      const history: any[] = [];
      const regulationLevel = 70;

      const result = classifySentiment(message, history, regulationLevel);

      expect(result.shouldIntervene).toBe(true);
      expect(result.stressLevel).toBe('crisis');
      expect(result.detectedPatterns).toContain('crisis');
    });

    it('should detect panic patterns', () => {
      const message = "I can't breathe";
      const history: any[] = [];
      const regulationLevel = 70;

      const result = classifySentiment(message, history, regulationLevel);

      expect(result.shouldIntervene).toBe(true);
      expect(result.stressLevel).toBe('high');
      expect(result.detectedPatterns).toContain('panic');
    });

    it('should classify as medium stress with 2 signals but not intervene', () => {
      const message = 'This is hard';
      const history = [
        { role: 'USER', content: "I can't do this", createdAt: new Date() },
        { role: 'USER', content: 'I hate this', createdAt: new Date() },
      ];
      const regulationLevel = 70;

      const result = classifySentiment(message, history, regulationLevel);

      expect(result.shouldIntervene).toBe(false);
      expect(result.stressLevel).toBe('medium');
    });

    it('should trigger intervention when regulation level < 40', () => {
      const message = 'Can you help me with this?';
      const history: any[] = [];
      const regulationLevel = 35;

      const result = classifySentiment(message, history, regulationLevel);

      expect(result.shouldIntervene).toBe(true);
      expect(result.stressLevel).toBe('high');
      expect(result.reasoning).toContain('Regulation level moderately low');
    });

    it('should classify as medium when regulation level < 60', () => {
      const message = 'Okay';
      const history: any[] = [];
      const regulationLevel = 55;

      const result = classifySentiment(message, history, regulationLevel);

      expect(result.shouldIntervene).toBe(false);
      expect(result.stressLevel).toBe('medium');
    });

    it('should handle empty message history', () => {
      const message = 'Hello';
      const history: any[] = [];
      const regulationLevel = 70;

      const result = classifySentiment(message, history, regulationLevel);

      expect(result.shouldIntervene).toBe(false);
      expect(result.stressLevel).toBe('low');
    });

    it('should only count stress once per message in history', () => {
      const message = 'Help me';
      const history = [
        { role: 'USER', content: "I can't do this I hate this I'm stupid", createdAt: new Date() },
        { role: 'USER', content: 'This is fine', createdAt: new Date() },
      ];
      const regulationLevel = 70;

      const result = classifySentiment(message, history, regulationLevel);

      // Should only count 1 stress message, not 3 (even though message has 3 patterns)
      expect(result.shouldIntervene).toBe(false);
    });

    it('should ignore ASSISTANT messages in cumulative stress', () => {
      const message = 'Okay';
      const history = [
        { role: 'USER', content: "I can't do this", createdAt: new Date() },
        { role: 'ASSISTANT', content: "I hate this", createdAt: new Date() },
        { role: 'USER', content: 'I give up', createdAt: new Date() },
      ];
      const regulationLevel = 70;

      const result = classifySentiment(message, history, regulationLevel);

      // Should only count 2 USER messages with stress
      expect(result.shouldIntervene).toBe(false);
      expect(result.stressLevel).toBe('medium');
    });
  });

  describe('formatInterventionMessage', () => {
    it('should format Garden Breathing exercise correctly', () => {
      const exercise = REGULATION_EXERCISES.gardenBreathing;
      const formatted = formatInterventionMessage(exercise);

      expect(formatted).toContain('Garden Breathing');
      // eslint-disable-next-line no-restricted-syntax
      expect(formatted).toContain('🌱');
      expect(formatted).toContain('feeling overwhelmed');
      expect(formatted).toContain('1.');
      expect(formatted).toContain(exercise.closingPrompt);
      expect(formatted).toContain('---');
    });

    it('should format 5-4-3-2-1 Grounding exercise correctly', () => {
      const exercise = REGULATION_EXERCISES.grounding5421;
      const formatted = formatInterventionMessage(exercise);

      expect(formatted).toContain('5-4-3-2-1 Grounding');
      expect(formatted).toContain('5 things you can see');
      expect(formatted).toMatch(/\d+\./); // Has numbered list
    });

    it('should include all exercise instructions', () => {
      const exercise = REGULATION_EXERCISES.gardenSensory;
      const formatted = formatInterventionMessage(exercise);

      // All instructions should be present
      exercise.instructions.forEach((instruction) => {
        expect(formatted).toContain(instruction);
      });
    });
  });

  describe('REGULATION_EXERCISES', () => {
    it('should have all required exercises defined', () => {
      expect(REGULATION_EXERCISES.gardenBreathing).toBeDefined();
      expect(REGULATION_EXERCISES.grounding5421).toBeDefined();
      expect(REGULATION_EXERCISES.gardenSensory).toBeDefined();
    });

    it('should have valid exercise structure', () => {
      Object.values(REGULATION_EXERCISES).forEach((exercise) => {
        expect(exercise.title).toBeTruthy();
        expect(exercise.duration).toBeGreaterThan(0);
        expect(exercise.emoji).toBeTruthy();
        expect(exercise.instructions).toBeInstanceOf(Array);
        expect(exercise.instructions.length).toBeGreaterThan(0);
        expect(exercise.closingPrompt).toBeTruthy();
      });
    });
  });
});
