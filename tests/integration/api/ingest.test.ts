import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    ingestLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/embeddings', () => ({
  generateEmbeddings: vi.fn((texts: string[]) => 
    Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))
  ),
}));

vi.mock('@/lib/pinecone', () => ({
  upsertVectors: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/curriculum/parser', () => ({
  parseCurriculumFile: vi.fn(() => Promise.resolve([
    {
      id: 'chunk_1',
      text: 'Test curriculum content',
      metadata: { subject: 'MATH', gradeLevel: 5 },
    },
  ])),
}));

describe('POST /api/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.N8N_WEBHOOK_SECRET = 'test_secret_123';
  });

  it('returns 401 when webhook secret is missing', async () => {
    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      body: JSON.stringify({
        source: 'WEBHOOK',
        files: [],
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('returns 401 when webhook secret is incorrect', async () => {
    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong_secret' },
      body: JSON.stringify({
        source: 'WEBHOOK',
        files: [],
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('processes files successfully with correct secret', async () => {
    const { db } = await import('@/lib/db');
    const { upsertVectors } = await import('@/lib/pinecone');
    const { parseCurriculumFile } = await import('@/lib/curriculum/parser');
    
    vi.mocked(db.ingestLog.create)
      .mockResolvedValueOnce({ id: 'log_123' } as any)
      .mockResolvedValueOnce({ id: 'log_123' } as any);
    vi.mocked(db.ingestLog.update).mockResolvedValue({ id: 'log_123' } as any);

    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer test_secret_123' },
      body: JSON.stringify({
        source: 'WEBHOOK',
        files: [
          {
            path: 'test-file.md',
            content: 'Test content',
            metadata: { subject: 'MATH' },
          },
        ],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processedFiles).toBe(1);
    expect(parseCurriculumFile).toHaveBeenCalledTimes(1);
    expect(upsertVectors).toHaveBeenCalledTimes(1);
  });

  it('processes empty file list successfully', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.ingestLog.create).mockResolvedValueOnce({ id: 'log_123' } as any);
    vi.mocked(db.ingestLog.update).mockResolvedValue({ id: 'log_123' } as any);

    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer test_secret_123' },
      body: JSON.stringify({
        source: 'WEBHOOK',
        files: [],
      }),
    });

    const response = await POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.processedFiles).toBe(0);
  });

  it('handles file processing errors gracefully', async () => {
    const { db } = await import('@/lib/db');
    const { parseCurriculumFile } = await import('@/lib/curriculum/parser');
    
    vi.mocked(db.ingestLog.create).mockResolvedValueOnce({ id: 'log_123' } as any);
    vi.mocked(db.ingestLog.update).mockResolvedValue({ id: 'log_123' } as any);
    vi.mocked(parseCurriculumFile).mockRejectedValueOnce(new Error('Parse error'));

    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer test_secret_123' },
      body: JSON.stringify({
        source: 'WEBHOOK',
        files: [
          {
            path: 'failing-file.md',
            content: 'Test content',
          },
        ],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processedFiles).toBe(0);
    expect(data.failedFiles).toBe(1);
    expect(data.errors).toBeDefined();
  });

  it('processes multiple files in batches', async () => {
    const { db } = await import('@/lib/db');
    const { parseCurriculumFile } = await import('@/lib/curriculum/parser');
    
    vi.mocked(db.ingestLog.create).mockResolvedValueOnce({ id: 'log_123' } as any);
    vi.mocked(db.ingestLog.update).mockResolvedValue({ id: 'log_123' } as any);

    const files = Array.from({ length: 15 }, (_, i) => ({
      path: `file-${i}.md`,
      content: `Content ${i}`,
    }));

    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer test_secret_123' },
      body: JSON.stringify({
        source: 'WEBHOOK',
        files,
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.processedFiles).toBe(15);
    expect(parseCurriculumFile).toHaveBeenCalledTimes(15);
  });

  it('updates progress incrementally during batch processing', async () => {
    const { db } = await import('@/lib/db');
    
    vi.mocked(db.ingestLog.create).mockResolvedValueOnce({ id: 'log_123' } as any);
    vi.mocked(db.ingestLog.update).mockResolvedValue({ id: 'log_123' } as any);

    const files = Array.from({ length: 5 }, (_, i) => ({
      path: `file-${i}.md`,
      content: `Content ${i}`,
    }));

    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer test_secret_123' },
      body: JSON.stringify({
        source: 'WEBHOOK',
        files,
      }),
    });

    await POST(req);

    // Should update progress and final result
    expect(db.ingestLog.update).toHaveBeenCalled();
  });
});
