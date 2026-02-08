import { beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/lib/db';

beforeAll(async () => {
  // Ensure Prisma is ready for integration tests
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

// Mock external APIs to avoid real API calls
vi.mock('@/lib/ai/client', () => ({
  anthropic: {
    messages: {
      stream: vi.fn(() => ({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Test response' } };
        },
        finalMessage: vi.fn(() => ({
          usage: { input_tokens: 100, output_tokens: 50 },
        })),
      })),
      create: vi.fn(() => ({
        content: [{ text: 'Test response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      })),
    },
  },
  openai: {
    chat: {
      completions: {
        create: vi.fn(() => ({
          choices: [{ message: { content: 'Test response' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        })),
      },
    },
    embeddings: {
      create: vi.fn(() => ({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      })),
    },
  },
  AI_MODELS: {
    primary: 'claude-3-5-sonnet-20241022',
    fallback: 'gpt-4o',
    embeddings: 'text-embedding-3-small',
  },
}));

vi.mock('stripe', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn(() => ({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/test',
        })),
      },
    },
    subscriptions: {
      retrieve: vi.fn(() => ({
        id: 'sub_test_123',
        status: 'active',
      })),
    },
    customers: {
      create: vi.fn(() => ({
        id: 'cus_test_123',
      })),
    },
  };
  return {
    default: vi.fn(() => mockStripe),
  };
});

// Mock Pinecone
vi.mock('@/lib/pinecone', () => ({
  upsertVectors: vi.fn(() => Promise.resolve()),
  searchVectors: vi.fn(() => Promise.resolve([])),
}));

// Mock vector search
vi.mock('@/lib/vector-search', () => ({
  searchCurriculum: vi.fn(() => Promise.resolve([])),
  formatCurriculumContext: vi.fn(() => ''),
}));

// Mock embeddings
vi.mock('@/lib/embeddings', () => ({
  generateEmbeddings: vi.fn((texts: string[]) => 
    Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))
  ),
}));

// Mock curriculum parser
vi.mock('@/lib/curriculum/parser', () => ({
  parseCurriculumFile: vi.fn(() => Promise.resolve([
    {
      id: 'chunk_1',
      text: 'Test curriculum content',
      metadata: { subject: 'MATH', gradeLevel: 5 },
    },
  ])),
}));
