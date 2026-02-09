import { describe, expect, it } from 'vitest';
import { buildCurriculumFilter } from '@/lib/pinecone';

describe('buildCurriculumFilter', () => {
  it('uses $eq for single subject', () => {
    expect(buildCurriculumFilter({ subject: 'FINANCIAL_LITERACY' })).toEqual({
      subject: { $eq: 'FINANCIAL_LITERACY' },
    });
  });

  it('uses $in for multiple subjects', () => {
    expect(buildCurriculumFilter({ subjects: ['MATH', 'FINANCIAL_LITERACY'] })).toEqual({
      subject: { $in: ['MATH', 'FINANCIAL_LITERACY'] },
    });
  });
});
