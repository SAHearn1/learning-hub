import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEmbedding, generateEmbeddings } from '../embeddings';
import * as embeddingsLib from '@/lib/embeddings';

// Mock the embeddings library
vi.mock('@/lib/embeddings', () => ({
  generateEmbedding: vi.fn(),
  generateEmbeddings: vi.fn(),
}));

describe('pinecone/embeddings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should call the embeddings library and return the result', async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      vi.mocked(embeddingsLib.generateEmbedding).mockResolvedValue(mockEmbedding);

      const result = await generateEmbedding('test text');

      expect(embeddingsLib.generateEmbedding).toHaveBeenCalledWith('test text');
      expect(result).toEqual(mockEmbedding);
    });

    it('should throw error when embeddings library fails', async () => {
      const mockError = new Error('OpenAI API error');
      vi.mocked(embeddingsLib.generateEmbedding).mockRejectedValue(mockError);

      await expect(generateEmbedding('test text')).rejects.toThrow('OpenAI API error');
    });
  });

  describe('generateEmbeddings', () => {
    it('should call the embeddings library for batch processing', async () => {
      const mockEmbeddings = [
        new Array(1536).fill(0.1),
        new Array(1536).fill(0.2),
        new Array(1536).fill(0.3),
      ];
      vi.mocked(embeddingsLib.generateEmbeddings).mockResolvedValue(mockEmbeddings);

      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await generateEmbeddings(texts);

      expect(embeddingsLib.generateEmbeddings).toHaveBeenCalledWith(texts);
      expect(result).toEqual(mockEmbeddings);
      expect(result).toHaveLength(3);
    });

    it('should handle empty array', async () => {
      vi.mocked(embeddingsLib.generateEmbeddings).mockResolvedValue([]);

      const result = await generateEmbeddings([]);

      expect(embeddingsLib.generateEmbeddings).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });

    it('should throw error when batch processing fails', async () => {
      const mockError = new Error('Batch processing failed');
      vi.mocked(embeddingsLib.generateEmbeddings).mockRejectedValue(mockError);

      await expect(generateEmbeddings(['text 1', 'text 2'])).rejects.toThrow('Batch processing failed');
    });
  });
});
