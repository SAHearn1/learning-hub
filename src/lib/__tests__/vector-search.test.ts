import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchCurriculum, formatCurriculumContext } from '@/lib/vector-search';
import * as embeddings from '@/lib/embeddings';
import * as pinecone from '@/lib/pinecone';
import * as hybridSearch from '@/lib/hybrid-search';

vi.mock('@/lib/embeddings', () => ({
  generateEmbedding: vi.fn(),
}));

vi.mock('@/lib/pinecone', () => ({
  queryVectors: vi.fn(),
}));

vi.mock('@/lib/hybrid-search', () => ({
  searchCurriculumHybrid: vi.fn(),
}));

describe('vector-search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.PINECONE_API_KEY = 'test-key';
  });

  it('retrieves curriculum-aligned contexts with metadata filtering', async () => {
    vi.mocked(embeddings.generateEmbedding).mockResolvedValue([0.1, 0.2]);
    vi.mocked(pinecone.queryVectors).mockResolvedValue([
      {
        id: 'a',
        score: 0.91,
        metadata: {
          text: 'Use manipulatives to model equivalent fractions before symbolic notation.',
          filename: 'docs/docs/04-grade-bands/3-5/part-2.md',
          subject: 'MATH',
          gradeLevel: 4,
          standardCodes: ['CCSS.MATH.CONTENT.4.NF.A.1'],
        },
      },
      {
        id: 'b',
        score: 0.2,
        metadata: {
          text: 'Out-of-band result',
          filename: 'docs/docs/04-grade-bands/9-12/part-4.md',
          subject: 'MATH',
          gradeLevel: 10,
          standardCodes: [],
        },
      },
    ] as any);

    const results = await searchCurriculum('How do I teach equivalent fractions in grade 4?', {
      subject: 'MATH',
      gradeLevel: 4,
      minScore: 0.35,
      topK: 5,
    });

    expect(embeddings.generateEmbedding).toHaveBeenCalled();
    expect(pinecone.queryVectors).toHaveBeenCalledWith([0.1, 0.2], expect.objectContaining({
      subject: 'MATH',
      gradeLevel: 4,
      topK: 5,
    }));
    expect(results).toHaveLength(1);
    expect(results[0].text).toContain('equivalent fractions');

    const context = formatCurriculumContext(results);
    expect(context).toContain('Relevant Curriculum Content');
    expect(context).toContain('CCSS.MATH.CONTENT.4.NF.A.1');
  });

  it('uses hybrid retrieval and reranking when supabase is configured', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

    vi.mocked(embeddings.generateEmbedding).mockResolvedValue([0.11, 0.22]);
    vi.mocked(hybridSearch.searchCurriculumHybrid).mockResolvedValue([
      {
        id: 'h1',
        text: 'Mitochondria is the powerhouse of the cell.',
        filename: 'biology/chapter-2.md',
        subject: 'SCIENCE',
        gradeLevel: 7,
        standardCodes: ['NGSS.MS-LS1-2'],
        vectorScore: 0.71,
        keywordScore: 0.95,
        hybridScore: 0.9,
      },
    ]);

    const results = await searchCurriculum('Define mitochondria', { subject: 'SCIENCE', gradeLevel: 7, topK: 5 });

    expect(hybridSearch.searchCurriculumHybrid).toHaveBeenCalledWith('Define mitochondria', [0.11, 0.22], {
      topK: 5,
      subject: 'SCIENCE',
      gradeLevel: 7,
    });
    expect(pinecone.queryVectors).not.toHaveBeenCalled();
    expect(results[0].score).toBeGreaterThan(0.5);
  });

  it('uses cache for repeated retrieval on same query/filter set', async () => {
    vi.mocked(embeddings.generateEmbedding).mockResolvedValue([0.5, 0.6]);
    vi.mocked(pinecone.queryVectors).mockResolvedValue([
      {
        id: 'cached-1',
        score: 0.88,
        metadata: {
          text: 'Anchor SEL reflection prompts to restorative routines.',
          filename: 'docs/docs/03-5rs-framework/reflect.md',
          subject: 'INTERDISCIPLINARY',
          gradeLevel: 7,
          standardCodes: [],
        },
      },
    ] as any);

    const options = { subject: 'INTERDISCIPLINARY', gradeLevel: 7, topK: 3 };
    const first = await searchCurriculum('How can I run reflection circles after conflict?', options);
    const second = await searchCurriculum('How can I run reflection circles after conflict?', options);

    expect(first).toEqual(second);
    expect(pinecone.queryVectors).toHaveBeenCalledTimes(1);
  });

  it('passes multi-subject filters for FINLIT-aware retrieval', async () => {
    vi.mocked(embeddings.generateEmbedding).mockResolvedValue([0.9, 0.1]);
    vi.mocked(pinecone.queryVectors).mockResolvedValue([
      {
        id: 'finlit-1',
        score: 0.92,
        metadata: {
          text: 'Compound interest grows as interest earns interest over time.',
          filename: 'finlit/compound-interest.md',
          subject: 'FINANCIAL_LITERACY',
          gradeLevel: 8,
          standardCodes: ['FINLIT.CI.1'],
        },
      },
    ] as any);

    const results = await searchCurriculum('What is compound interest?', {
      subjects: ['MATH', 'FINANCIAL_LITERACY'],
      gradeLevel: 8,
      topK: 5,
    });

    expect(pinecone.queryVectors).toHaveBeenCalledWith([0.9, 0.1], expect.objectContaining({
      subjects: ['MATH', 'FINANCIAL_LITERACY'],
      gradeLevel: 8,
      topK: 5,
    }));
    expect(results).toHaveLength(1);
    expect(results[0].subject).toBe('FINANCIAL_LITERACY');
  });

});
