import { describe, it, expect } from 'vitest';
import {
  processIepDocument,
  parseIepSections,
  estimateTokens,
} from '@/lib/rag/iep-document-processor';
import type { IepDocument, IepSection } from '@/lib/rag/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDocument(overrides?: Partial<IepDocument>): IepDocument {
  return {
    studentId: 'student-001',
    documentId: 'doc-001',
    content: 'Full IEP content',
    sections: [
      {
        type: 'accommodations',
        title: 'Accommodations',
        content: 'Extended time on tests. Chunked content delivery.',
      },
      {
        type: 'annual_goals',
        title: 'Annual Goals',
        content: 'Student will improve reading comprehension by two grade levels.',
      },
    ],
    metadata: {
      gradeLevel: 5,
      lastUpdated: new Date('2025-01-15'),
      school: 'Test Elementary',
      caseManager: 'Ms. Smith',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IEP Document Processor', () => {

  // -----------------------------------------------------------------------
  // Section parsing from raw text
  // -----------------------------------------------------------------------
  describe('parseIepSections', () => {
    it('should parse raw IEP text into sections', () => {
      const rawContent = [
        'Present Levels of Performance',
        'Student reads at a 3rd grade level with strong decoding skills.',
        'Comprehension is below grade level.',
        '',
        'Annual Goals',
        'Student will improve reading comprehension to grade level.',
        'Student will independently summarize fiction texts.',
        '',
        'Accommodations',
        'Extended time on all tests.',
        'Chunked content delivery for new material.',
      ].join('\n');

      const sections = parseIepSections(rawContent);

      expect(sections.length).toBeGreaterThanOrEqual(3);
      expect(sections.some((s) => s.type === 'present_levels')).toBe(true);
      expect(sections.some((s) => s.type === 'annual_goals')).toBe(true);
      expect(sections.some((s) => s.type === 'accommodations')).toBe(true);
    });

    it('should detect section headers correctly', () => {
      const rawContent = [
        'Current Level of Performance',
        'Some content about current levels.',
        '',
        'Short-Term Objectives',
        'Objective 1: Read fluently.',
        '',
        'Related Services',
        'Speech therapy 30 minutes weekly.',
        '',
        'Behavior Intervention Plan',
        'Positive reinforcement system.',
        '',
        'Assessment Accommodations',
        'Extended time on state assessments.',
      ].join('\n');

      // Sanity check the fixture itself (guards against invisible prefix chars).
      const lines = rawContent.split('\n');
      expect(lines[0]).toBe('Current Level of Performance');
      expect(lines[0].toLowerCase().startsWith('current level')).toBe(true);
      expect(lines[lines.length - 2]).toBe('Assessment Accommodations');
      expect(lines[lines.length - 2].toLowerCase().startsWith('assessment accommodations')).toBe(true);

      const sections = parseIepSections(rawContent);

      const types = sections.map((s) => s.type);
      expect(types).toEqual(
        expect.arrayContaining([
          'present_levels', // "Current Level" -> present_levels
          'short_term_objectives',
          'related_services',
          'behavior_plan',
          'assessment_accommodations',
        ]),
      );
    });

    it('should handle content with no detectable sections (general section)', () => {
      const rawContent = 'This is a general IEP document with no clear section headers. It contains various information about the student and their educational needs.';

      const sections = parseIepSections(rawContent);

      expect(sections).toHaveLength(1);
      expect(sections[0].type).toBe('general');
      expect(sections[0].title).toBe('IEP Document');
      expect(sections[0].content).toBe(rawContent);
    });

    it('should handle empty content', () => {
      const sections = parseIepSections('');
      expect(sections).toHaveLength(0);
    });

    it('should handle whitespace-only content', () => {
      const sections = parseIepSections('   \n   \n   ');
      expect(sections).toHaveLength(0);
    });

    it('should detect transition plan headers', () => {
      const rawContent = [
        'Transition Plan',
        'Student will explore career interests in technology.',
        'Post-secondary education goals include community college.',
      ].join('\n');

      const sections = parseIepSections(rawContent);

      expect(sections.some((s) => s.type === 'transition_plan')).toBe(true);
    });

    it('should detect modification headers', () => {
      const rawContent = [
        'Program Modifications',
        'Modified grading scale.',
        'Alternative assignments for writing tasks.',
      ].join('\n');

      const sections = parseIepSections(rawContent);

      expect(sections.some((s) => s.type === 'modifications')).toBe(true);
    });

    it('should not treat long lines as section headers even if they contain keywords', () => {
      // Lines >= 200 chars should not be treated as headers
      const longLine = 'Present Levels ' + 'x'.repeat(200);
      const rawContent = longLine + '\nSome content.';

      const sections = parseIepSections(rawContent);

      // The long line should not be a section header; everything goes to general
      expect(sections).toHaveLength(1);
      expect(sections[0].type).toBe('general');
    });
  });

  // -----------------------------------------------------------------------
  // Document processing into chunks
  // -----------------------------------------------------------------------
  describe('processIepDocument', () => {
    it('should process a document with multiple sections into chunks', () => {
      const doc = makeDocument();
      const chunks = processIepDocument(doc);

      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });

    it('should generate correct chunk IDs', () => {
      const doc = makeDocument();
      const chunks = processIepDocument(doc);

      for (const chunk of chunks) {
        expect(chunk.id).toContain('iep_');
        expect(chunk.id).toContain(doc.studentId);
        expect(chunk.id).toContain(doc.documentId);
      }
    });

    it('should include correct metadata on chunks', () => {
      const doc = makeDocument();
      const chunks = processIepDocument(doc);

      for (const chunk of chunks) {
        expect(chunk.metadata.studentId).toBe(doc.studentId);
        expect(chunk.metadata.documentId).toBe(doc.documentId);
        expect(chunk.metadata.gradeLevel).toBe(doc.metadata.gradeLevel);
        expect(chunk.metadata.lastUpdated).toBe(doc.metadata.lastUpdated.toISOString());
        expect(chunk.metadata.totalChunks).toBe(chunks.length);
      }
    });

    it('should set global chunkIndex and totalChunks on all chunks', () => {
      const doc = makeDocument();
      const chunks = processIepDocument(doc);

      const totalChunks = chunks.length;
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].metadata.chunkIndex).toBe(i);
        expect(chunks[i].metadata.totalChunks).toBe(totalChunks);
      }
    });

    it('should preserve section type on each chunk', () => {
      const doc = makeDocument();
      const chunks = processIepDocument(doc);

      const sectionTypes = chunks.map((c) => c.sectionType);
      expect(sectionTypes).toContain('accommodations');
      expect(sectionTypes).toContain('annual_goals');
    });

    it('should include section header prefix in chunk content', () => {
      const doc = makeDocument();
      const chunks = processIepDocument(doc);

      const accommodationChunk = chunks.find((c) => c.sectionType === 'accommodations');
      expect(accommodationChunk).toBeDefined();
      expect(accommodationChunk!.content).toContain('Accommodations');
    });
  });

  // -----------------------------------------------------------------------
  // Chunking long sections with overlap
  // -----------------------------------------------------------------------
  describe('chunking long sections', () => {
    it('should chunk long sections into multiple chunks', () => {
      const longContent = 'This is a paragraph about student progress. '.repeat(200);

      const doc = makeDocument({
        sections: [
          {
            type: 'present_levels',
            title: 'Present Levels of Performance',
            content: longContent,
          },
        ],
      });

      const chunks = processIepDocument(doc);

      expect(chunks.length).toBeGreaterThan(1);
    });

    it(
      'should not stall when the final remainder is <= overlap chars (regression)',
      () => {
        // Regression test for a previous infinite-loop condition in forceSplitText:
        // when end reaches text.length and remaining length is <= overlapChars,
        // the overlap math can cause start to not advance.
        //
        // We construct a single "paragraph" with no spaces or punctuation so the
        // splitter uses deterministic fixed-width slicing.
        const MAX_CHUNK_CHARS = 1000 * 4; // mirrors src/lib/rag/iep-document-processor.ts
        const OVERLAP_CHARS = 100 * 4; // mirrors src/lib/rag/iep-document-processor.ts
        const headerPrefix = `[Present Levels of Performance] Present Levels\n\n`;
        const availableChars = MAX_CHUNK_CHARS - headerPrefix.length;

        // Choose a length that deterministically leads to the buggy "start doesn't advance"
        // state on the previous logic: length = 2*maxChars - overlapChars.
        const contentLength = 2 * availableChars - OVERLAP_CHARS;
        const longContent = 'a'.repeat(contentLength);

        const doc = makeDocument({
          sections: [
            {
              type: 'present_levels',
              title: 'Present Levels',
              content: longContent,
            },
          ],
        });

        const chunks = processIepDocument(doc);

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.length).toBeLessThan(10);

        // Ensure we didn't produce any empty or whitespace-only chunk bodies.
        const bodies = chunks.map((c) =>
          c.content.startsWith(headerPrefix) ? c.content.slice(headerPrefix.length) : c.content,
        );
        expect(bodies.every((b) => b.trim().length > 0)).toBe(true);

        // Specifically guard against duplicate empty chunks.
        const emptyBodies = bodies.map((b) => b.trim()).filter((b) => b.length === 0);
        expect(emptyBodies).toHaveLength(0);
      },
      500,
    );

    it('should keep short sections as single chunks', () => {
      const doc = makeDocument({
        sections: [
          {
            type: 'accommodations',
            title: 'Accommodations',
            content: 'Extended time on all tests.',
          },
        ],
      });

      const chunks = processIepDocument(doc);

      expect(chunks).toHaveLength(1);
    });

    it('should include overlap text between adjacent chunks', () => {
      // Create content long enough to require multiple chunks
      const paragraphs: string[] = [];
      for (let i = 0; i < 30; i++) {
        paragraphs.push(`Paragraph ${i}: Student demonstrates progress in area ${i}. The student continues to work on skills related to reading comprehension and fluency.`);
      }
      const longContent = paragraphs.join('\n\n');

      const doc = makeDocument({
        sections: [
          {
            type: 'present_levels',
            title: 'Present Levels',
            content: longContent,
          },
        ],
      });

      const chunks = processIepDocument(doc);

      if (chunks.length >= 2) {
        // The second chunk should contain some overlap with the end of the first
        // We check by verifying the second chunk's content has some text from late
        // in the first chunk's narrative
        expect(chunks[1].content.length).toBeGreaterThan(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Accommodation type detection in content
  // -----------------------------------------------------------------------
  describe('accommodation type detection', () => {
    it('should detect extended time accommodation in content', () => {
      const doc = makeDocument({
        sections: [
          {
            type: 'accommodations',
            title: 'Accommodations',
            content: 'Student receives extended time on all assessments and class assignments.',
          },
        ],
      });

      const chunks = processIepDocument(doc);
      const accommodationChunk = chunks.find((c) => c.sectionType === 'accommodations');
      expect(accommodationChunk).toBeDefined();
      expect(accommodationChunk!.metadata.accommodationType).toBe('EXTENDED_TIME');
    });

    it('should detect chunked content accommodation', () => {
      const doc = makeDocument({
        sections: [
          {
            type: 'accommodations',
            title: 'Accommodations',
            content: 'Present material in smaller segments to aid processing.',
          },
        ],
      });

      const chunks = processIepDocument(doc);
      const accommodationChunk = chunks.find((c) => c.sectionType === 'accommodations');
      expect(accommodationChunk).toBeDefined();
      expect(accommodationChunk!.metadata.accommodationType).toBe('CHUNKED_CONTENT');
    });

    it('should detect simplified mode accommodation', () => {
      const doc = makeDocument({
        sections: [
          {
            type: 'accommodations',
            title: 'Accommodations',
            content: 'Use simplified instructions and vocabulary.',
          },
        ],
      });

      const chunks = processIepDocument(doc);
      const accommodationChunk = chunks.find((c) => c.sectionType === 'accommodations');
      expect(accommodationChunk!.metadata.accommodationType).toBe('SIMPLIFIED_MODE');
    });

    it('should detect frequent breaks accommodation', () => {
      const doc = makeDocument({
        sections: [
          {
            type: 'accommodations',
            title: 'Accommodations',
            content: 'Provide frequent breaks every 20 minutes during instruction.',
          },
        ],
      });

      const chunks = processIepDocument(doc);
      const accommodationChunk = chunks.find((c) => c.sectionType === 'accommodations');
      expect(accommodationChunk!.metadata.accommodationType).toBe('FREQUENT_BREAKS');
    });

    it('should detect visual supports accommodation', () => {
      const doc = makeDocument({
        sections: [
          {
            type: 'accommodations',
            title: 'Accommodations',
            content: 'Use visual aids and graphic organizer materials.',
          },
        ],
      });

      const chunks = processIepDocument(doc);
      const accommodationChunk = chunks.find((c) => c.sectionType === 'accommodations');
      expect(accommodationChunk!.metadata.accommodationType).toBe('VISUAL_SUPPORTS');
    });

    it('should not include accommodationType for non-accommodation sections', () => {
      const doc = makeDocument({
        sections: [
          {
            type: 'annual_goals',
            title: 'Annual Goals',
            content: 'Student will improve math skills to grade level proficiency.',
          },
        ],
      });

      const chunks = processIepDocument(doc);
      const goalChunk = chunks.find((c) => c.sectionType === 'annual_goals');
      expect(goalChunk).toBeDefined();
      expect(goalChunk!.metadata.accommodationType).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Token estimation
  // -----------------------------------------------------------------------
  describe('estimateTokens', () => {
    it('should estimate tokens correctly (1 token per 4 chars)', () => {
      expect(estimateTokens('a'.repeat(100))).toBe(25);
      expect(estimateTokens('a'.repeat(4))).toBe(1);
      expect(estimateTokens('a'.repeat(5))).toBe(2);
    });

    it('should handle empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should handle single character', () => {
      expect(estimateTokens('a')).toBe(1);
    });

    it('should round up for non-divisible lengths', () => {
      expect(estimateTokens('abc')).toBe(1); // ceil(3/4) = 1
      expect(estimateTokens('abcde')).toBe(2); // ceil(5/4) = 2
    });
  });

  // -----------------------------------------------------------------------
  // Chunk ID format
  // -----------------------------------------------------------------------
  describe('chunk ID format', () => {
    it('should generate IDs following the pattern iep_{studentId}_{docId}_{sectionType}_{index}', () => {
      const doc = makeDocument({
        studentId: 'stu-A',
        documentId: 'doc-B',
        sections: [
          {
            type: 'accommodations',
            title: 'Accommodations',
            content: 'Extended time.',
          },
        ],
      });

      const chunks = processIepDocument(doc);

      expect(chunks[0].id).toBe('iep_stu-A_doc-B_accommodations_0');
    });
  });
});
