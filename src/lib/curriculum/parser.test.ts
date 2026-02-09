import { describe, expect, it } from 'vitest';
import { parseCurriculumFile } from '@/lib/curriculum/parser';

describe('curriculum parser', () => {
  it('parses markdown into chunks and infers metadata for filtering', async () => {
    const chunks = await parseCurriculumFile({
      path: 'docs/docs/04-grade-bands/3-5/part-1.md',
      content: '# Fraction Foundations\n\n## Lesson\n\nStudents compare fractions with visual models.',
      metadata: { subject: 'MATH', standardCodes: ['CCSS.MATH.CONTENT.3.NF.A.1'] },
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].metadata.gradeLevel).toBe(4);
    expect(chunks[0].metadata.subject).toBe('MATH');
    expect(chunks[0].metadata.course).toBe('3-5');
    expect(chunks[0].metadata.module).toBe('part-1');
    expect(chunks[0].metadata.sectionHeading).toBe('Lesson');
  });

  it('builds financial literacy chunks with deterministic IDs and hs metadata', async () => {
    const chunks = await parseCurriculumFile({
      path: 'docs/14-financial-literacy/chapter-2.md',
      content: '# Budgeting Basics\n\n## Fixed Expenses\n\nHousing and insurance are fixed expenses.\n\n### Practice\n\nCreate a monthly budget table.',
      metadata: { sourceCollection: '14-financial-literacy' },
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].id).toBe('finlit-ch02-0000');
    expect(chunks[0].metadata.subject).toBe('FINANCIAL_LITERACY');
    expect(chunks[0].metadata.gradeBand).toBe('HS');
    expect(chunks[0].metadata.gradeLevel).toEqual([9, 10, 11, 12]);
    expect(chunks[0].metadata.sourceCollection).toBe('14-financial-literacy');
    expect(chunks[0].metadata.sectionHeading).toBe('Fixed Expenses');
  });
});
