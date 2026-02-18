import { describe, expect, it } from 'vitest';

/**
 * Helper functions from chat route for testing
 * Extracted for unit testing without importing the full route
 */

/**
 * Construct GitHub URL for a source file
 */
function constructSourceUrl(filename: string): string {
  const baseUrl = 'https://github.com/SAHearn1/learning-hub/blob/main';
  const cleanPath = filename.startsWith('/') ? filename : `/${filename}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Extract source citations from Pinecone matches
 */
function extractCitations(matches: any[]) {
  return matches.map((match, idx) => {
    const metadata = match.metadata as Record<string, any> || {};
    
    return {
      id: match.id || `citation-${idx}`,
      filename: metadata.filename || 'Unknown',
      section: metadata.section,
      chunkIndex: metadata.chunkIndex ?? idx,
      totalChunks: metadata.totalChunks ?? 1,
      text: metadata.content || metadata.text || '',
      relevanceScore: match.score ?? 0,
      sourceUrl: metadata.sourceUrl || constructSourceUrl(metadata.filename || ''),
      subject: metadata.subject || '',
      gradeLevel: metadata.gradeLevel ?? 0,
      standardCodes: metadata.standardCodes || [],
      course: metadata.course,
      module: metadata.module,
    };
  });
}

describe('Citation Extraction', () => {
  describe('constructSourceUrl', () => {
    it('should construct GitHub URL with leading slash', () => {
      const url = constructSourceUrl('docs/curriculum/math.md');
      expect(url).toBe('https://github.com/SAHearn1/learning-hub/blob/main/docs/curriculum/math.md');
    });

    it('should handle filename with leading slash', () => {
      const url = constructSourceUrl('/docs/curriculum/math.md');
      expect(url).toBe('https://github.com/SAHearn1/learning-hub/blob/main/docs/curriculum/math.md');
    });

    it('should handle empty filename', () => {
      const url = constructSourceUrl('');
      expect(url).toBe('https://github.com/SAHearn1/learning-hub/blob/main/');
    });
  });

  describe('extractCitations', () => {
    it('should extract citations from Pinecone matches', () => {
      const matches = [
        {
          id: 'match-1',
          score: 0.95,
          metadata: {
            filename: '02-introduction/overview.md',
            section: 'Introduction',
            chunkIndex: 0,
            totalChunks: 5,
            content: 'This is the introduction to the curriculum.',
            text: 'Alternative text field',
            subject: 'MATH',
            gradeLevel: 5,
            standardCodes: ['5.NBT.1', '5.NBT.2'],
            course: 'RootWork Framework',
            module: 'Introduction',
          },
        },
        {
          id: 'match-2',
          score: 0.87,
          metadata: {
            filename: '03-theoretical-foundation/concepts.md',
            section: 'Core Concepts',
            chunkIndex: 2,
            totalChunks: 10,
            text: 'Understanding theoretical foundations.',
            subject: 'SCIENCE',
            gradeLevel: 6,
            standardCodes: ['MS-PS1-1'],
          },
        },
      ];

      const citations = extractCitations(matches);

      expect(citations).toHaveLength(2);
      
      // First citation
      expect(citations[0].id).toBe('match-1');
      expect(citations[0].filename).toBe('02-introduction/overview.md');
      expect(citations[0].section).toBe('Introduction');
      expect(citations[0].chunkIndex).toBe(0);
      expect(citations[0].totalChunks).toBe(5);
      expect(citations[0].text).toBe('This is the introduction to the curriculum.');
      expect(citations[0].relevanceScore).toBe(0.95);
      expect(citations[0].sourceUrl).toContain('02-introduction/overview.md');
      expect(citations[0].subject).toBe('MATH');
      expect(citations[0].gradeLevel).toBe(5);
      expect(citations[0].standardCodes).toEqual(['5.NBT.1', '5.NBT.2']);
      expect(citations[0].course).toBe('RootWork Framework');
      expect(citations[0].module).toBe('Introduction');

      // Second citation
      expect(citations[1].id).toBe('match-2');
      expect(citations[1].text).toBe('Understanding theoretical foundations.');
    });

    it('should handle missing metadata fields', () => {
      const matches = [
        {
          id: 'match-minimal',
          score: 0.75,
          metadata: {
            filename: 'test.md',
          },
        },
      ];

      const citations = extractCitations(matches);

      expect(citations).toHaveLength(1);
      expect(citations[0].id).toBe('match-minimal');
      expect(citations[0].filename).toBe('test.md');
      expect(citations[0].section).toBeUndefined();
      expect(citations[0].chunkIndex).toBe(0); // defaults to index
      expect(citations[0].totalChunks).toBe(1); // defaults to 1
      expect(citations[0].text).toBe(''); // empty when no content/text
      expect(citations[0].relevanceScore).toBe(0.75);
      expect(citations[0].standardCodes).toEqual([]);
    });

    it('should prefer content over text field', () => {
      const matches = [
        {
          id: 'match-1',
          score: 0.9,
          metadata: {
            filename: 'test.md',
            content: 'Primary content',
            text: 'Secondary text',
          },
        },
      ];

      const citations = extractCitations(matches);
      expect(citations[0].text).toBe('Primary content');
    });

    it('should use text field when content is missing', () => {
      const matches = [
        {
          id: 'match-1',
          score: 0.9,
          metadata: {
            filename: 'test.md',
            text: 'Secondary text',
          },
        },
      ];

      const citations = extractCitations(matches);
      expect(citations[0].text).toBe('Secondary text');
    });

    it('should generate ID when missing', () => {
      const matches = [
        {
          score: 0.8,
          metadata: { filename: 'test.md' },
        },
        {
          score: 0.7,
          metadata: { filename: 'test2.md' },
        },
      ];

      const citations = extractCitations(matches);
      expect(citations[0].id).toBe('citation-0');
      expect(citations[1].id).toBe('citation-1');
    });

    it('should handle empty matches array', () => {
      const citations = extractCitations([]);
      expect(citations).toEqual([]);
    });
  });
});
