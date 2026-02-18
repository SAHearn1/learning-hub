import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluateNVCCompliance, batchEvaluateNVC } from '../evaluator';
import type { NVCEvaluationResult } from '../evaluator';

// Mock the AI client
vi.mock('@/lib/ai/client', () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
  AI_MODELS: {
    primary: 'claude-3-5-sonnet-20241022',
    lightweight: 'claude-3-haiku-20240307',
  },
}));

describe('NVC Evaluator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('evaluateNVCCompliance', () => {
    it('should return null if API call fails', async () => {
      const { anthropic } = await import('@/lib/ai/client');
      vi.mocked(anthropic.messages.create).mockRejectedValueOnce(new Error('API Error'));

      const result = await evaluateNVCCompliance('Test message');
      expect(result).toBeNull();
    });

    it('should return null for non-text response', async () => {
      const { anthropic } = await import('@/lib/ai/client');
      vi.mocked(anthropic.messages.create).mockResolvedValueOnce({
        content: [{ type: 'image', source: {} }],
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      const result = await evaluateNVCCompliance('Test message');
      expect(result).toBeNull();
    });

    it('should return null if response does not contain valid JSON', async () => {
      const { anthropic } = await import('@/lib/ai/client');
      vi.mocked(anthropic.messages.create).mockResolvedValueOnce({
        content: [{ type: 'text', text: 'This is not JSON' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      const result = await evaluateNVCCompliance('Test message');
      expect(result).toBeNull();
    });

    it('should successfully parse valid NVC evaluation response', async () => {
      const { anthropic } = await import('@/lib/ai/client');
      const mockResponse = {
        isCompliant: true,
        nvcScore: 90,
        concerns: [],
        judgmentalPhrases: [],
        dismissivePhrases: [],
        suggestedRevisions: [],
        brief_analysis: 'Response is compliant with NVC principles',
      };

      vi.mocked(anthropic.messages.create).mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      const result = await evaluateNVCCompliance('Great work! You\'re making progress.');

      expect(result).toBeDefined();
      expect(result?.isCompliant).toBe(true);
      expect(result?.nvcScore).toBe(90);
      expect(result?.concerns).toEqual([]);
      expect(result?.llmTokens).toBe(150);
      expect(result?.llmLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should identify non-compliant responses', async () => {
      const { anthropic } = await import('@/lib/ai/client');
      const mockResponse = {
        isCompliant: false,
        nvcScore: 45,
        concerns: ['JUDGMENTAL_LANGUAGE', 'DISMISSIVE_TONE'],
        judgmentalPhrases: ['You\'re wrong', 'That\'s incorrect'],
        dismissivePhrases: ['Don\'t worry about it'],
        suggestedRevisions: [
          'Instead of "You\'re wrong", try "I notice a different result. Let\'s explore why."'
        ],
        brief_analysis: 'Response contains judgmental and dismissive language',
      };

      vi.mocked(anthropic.messages.create).mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
        usage: { input_tokens: 120, output_tokens: 80 },
      } as any);

      const result = await evaluateNVCCompliance('You\'re wrong. That\'s incorrect. Don\'t worry about it.');

      expect(result).toBeDefined();
      expect(result?.isCompliant).toBe(false);
      expect(result?.nvcScore).toBe(45);
      expect(result?.concerns).toContain('JUDGMENTAL_LANGUAGE');
      expect(result?.concerns).toContain('DISMISSIVE_TONE');
      expect(result?.judgmentalPhrases.length).toBeGreaterThan(0);
      expect(result?.suggestedRevisions.length).toBeGreaterThan(0);
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const { anthropic } = await import('@/lib/ai/client');
      const mockResponse = {
        isCompliant: true,
        nvcScore: 95,
        concerns: [],
        judgmentalPhrases: [],
        dismissivePhrases: [],
        suggestedRevisions: [],
        brief_analysis: 'Excellent NVC compliance',
      };

      const wrappedResponse = `Here's my analysis:\n\`\`\`json\n${JSON.stringify(mockResponse)}\n\`\`\``;

      vi.mocked(anthropic.messages.create).mockResolvedValueOnce({
        content: [{ type: 'text', text: wrappedResponse }],
        usage: { input_tokens: 100, output_tokens: 60 },
      } as any);

      const result = await evaluateNVCCompliance('I notice you\'re working through this step by step.');

      expect(result).toBeDefined();
      expect(result?.isCompliant).toBe(true);
      expect(result?.nvcScore).toBe(95);
    });

    it('should include conversation context when provided', async () => {
      const { anthropic } = await import('@/lib/ai/client');
      const mockResponse = {
        isCompliant: true,
        nvcScore: 88,
        concerns: [],
        judgmentalPhrases: [],
        dismissivePhrases: [],
        suggestedRevisions: [],
        brief_analysis: 'Contextually appropriate response',
      };

      vi.mocked(anthropic.messages.create).mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
        usage: { input_tokens: 150, output_tokens: 70 },
      } as any);

      const assistantResponse = 'I can see you\'re feeling frustrated. Let\'s take a step back.';
      const context = 'USER: I don\'t understand this at all!\nASSISTANT: Let me help you break it down.';

      const result = await evaluateNVCCompliance(assistantResponse, context);

      expect(result).toBeDefined();
      expect(anthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Conversation Context'),
            }),
          ]),
        })
      );
    });
  });

  describe('batchEvaluateNVC', () => {
    it('should evaluate multiple responses in batches', async () => {
      const { anthropic } = await import('@/lib/ai/client');
      const mockResponse = {
        isCompliant: true,
        nvcScore: 85,
        concerns: [],
        judgmentalPhrases: [],
        dismissivePhrases: [],
        suggestedRevisions: [],
        brief_analysis: 'Compliant',
      };

      vi.mocked(anthropic.messages.create).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      const responses = [
        { id: '1', content: 'Response 1' },
        { id: '2', content: 'Response 2' },
        { id: '3', content: 'Response 3' },
      ];

      const results = await batchEvaluateNVC(responses);

      expect(results.size).toBe(3);
      expect(results.get('1')).toBeDefined();
      expect(results.get('2')).toBeDefined();
      expect(results.get('3')).toBeDefined();
      expect(anthropic.messages.create).toHaveBeenCalledTimes(3);
    });

    it('should handle batch errors gracefully', async () => {
      const { anthropic } = await import('@/lib/ai/client');

      // First call succeeds, second fails, third succeeds
      vi.mocked(anthropic.messages.create)
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify({
            isCompliant: true,
            nvcScore: 85,
            concerns: [],
            judgmentalPhrases: [],
            dismissivePhrases: [],
            suggestedRevisions: [],
            brief_analysis: 'Good',
          }) }],
          usage: { input_tokens: 100, output_tokens: 50 },
        } as any)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify({
            isCompliant: true,
            nvcScore: 90,
            concerns: [],
            judgmentalPhrases: [],
            dismissivePhrases: [],
            suggestedRevisions: [],
            brief_analysis: 'Great',
          }) }],
          usage: { input_tokens: 100, output_tokens: 50 },
        } as any);

      const responses = [
        { id: '1', content: 'Response 1' },
        { id: '2', content: 'Response 2' },
        { id: '3', content: 'Response 3' },
      ];

      const results = await batchEvaluateNVC(responses);

      expect(results.size).toBe(3);
      expect(results.get('1')).toBeDefined();
      expect(results.get('2')).toBeNull();
      expect(results.get('3')).toBeDefined();
    });

    it('should process batches with size limit', async () => {
      const { anthropic } = await import('@/lib/ai/client');

      vi.mocked(anthropic.messages.create).mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          isCompliant: true,
          nvcScore: 85,
          concerns: [],
          judgmentalPhrases: [],
          dismissivePhrases: [],
          suggestedRevisions: [],
          brief_analysis: 'Good',
        }) }],
        usage: { input_tokens: 100, output_tokens: 50 },
      } as any);

      // Create 12 responses (should be processed in 3 batches of 5, 5, and 2)
      const responses = Array.from({ length: 12 }, (_, i) => ({
        id: String(i + 1),
        content: `Response ${i + 1}`,
      }));

      const results = await batchEvaluateNVC(responses);

      expect(results.size).toBe(12);
      expect(anthropic.messages.create).toHaveBeenCalledTimes(12);
    });
  });
});
