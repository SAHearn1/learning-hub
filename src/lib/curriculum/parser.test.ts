import { describe, expect, it } from 'vitest';
import { parseCurriculumFile } from '@/lib/curriculum/parser';

describe('curriculum parser', () => {
  it('parses markdown into chunks and infers metadata for filtering', async () => {
    const chunks = await parseCurriculumFile({
      path: 'docs/docs/04-grade-bands/3-5/part-1.md',
      content: '# Fraction Foundations\n\nStudents compare fractions with visual models.',
      metadata: { subject: 'MATH', standardCodes: ['CCSS.MATH.CONTENT.3.NF.A.1'] },
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].metadata.gradeLevel).toBe(4);
    expect(chunks[0].metadata.subject).toBe('MATH');
    expect(chunks[0].metadata.course).toBe('3-5');
    expect(chunks[0].metadata.module).toBe('part-1');
  });
});
