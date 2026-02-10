import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockPlatformConfigUpsert = vi.fn();
const mockIngestLogCreate = vi.fn();
const mockIngestLogUpdate = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    platformConfig: {
      upsert: mockPlatformConfigUpsert,
    },
    ingestLog: {
      create: mockIngestLogCreate,
      update: mockIngestLogUpdate,
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock('@/lib/embeddings', () => ({
  generateEmbeddings: vi.fn((texts: string[]) => Promise.resolve(texts.map(() => new Array(1536).fill(0.1)))),
}));

vi.mock('@/lib/pinecone', () => ({
  upsertVectors: vi.fn((vectors: unknown[]) => Promise.resolve(vectors.map((_, index) => `vec_${index}`))),
}));

vi.mock('@/lib/curriculum/parser', () => ({
  parseCurriculumFile: vi.fn((file: { path: string }) =>
    Promise.resolve([
      {
        id: `chunk_${file.path}`,
        text: 'Test curriculum content',
        metadata: { subject: 'MATH', gradeLevel: 5 },
      },
    ])
  ),
}));

describe('POST /api/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.N8N_WEBHOOK_SECRET = 'test_secret_123';
    mockPlatformConfigUpsert.mockResolvedValue({ key: 'default', ingestionEnabled: true });
    mockGetCurrentUser.mockResolvedValue(null);
    mockIngestLogCreate.mockResolvedValue({ id: 'log_123' });
    mockIngestLogUpdate.mockResolvedValue({ id: 'log_123' });
  });

  it('returns 401 when webhook secret is incorrect', async () => {
    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong_secret' },
      body: JSON.stringify({ source: 'WEBHOOK', files: [] }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('returns 503 when ingestion is disabled for webhook requests', async () => {
    mockPlatformConfigUpsert.mockResolvedValue({
      key: 'default',
      ingestionEnabled: false,
      ingestionReason: 'maintenance',
      ingestionDisabledAt: new Date('2026-01-01T00:00:00Z'),
    });

    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer test_secret_123' },
      body: JSON.stringify({ source: 'WEBHOOK', files: [{ path: 'test-file.md' }] }),
    });

    const response = await POST(req);
    expect(response.status).toBe(503);
  });

  it('returns 403 for manual ingestion when disabled and user is not platform admin', async () => {
    mockPlatformConfigUpsert.mockResolvedValue({
      key: 'default',
      ingestionEnabled: false,
      ingestionReason: 'maintenance',
      ingestionDisabledAt: new Date('2026-01-01T00:00:00Z'),
    });
    mockGetCurrentUser.mockResolvedValue({ id: 'u1', role: 'EDUCATOR' });

    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer test_secret_123' },
      body: JSON.stringify({ source: 'MANUAL', files: [{ path: 'test-file.md' }] }),
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
  });

  it('allows manual ingestion when disabled and user is platform admin', async () => {
    const { parseCurriculumFile } = await import('@/lib/curriculum/parser');

    mockPlatformConfigUpsert.mockResolvedValue({ key: 'default', ingestionEnabled: false });
    mockGetCurrentUser.mockResolvedValue({ id: 'u1', role: 'PLATFORM_ADMIN' });

    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer test_secret_123' },
      body: JSON.stringify({
        source: 'MANUAL',
        files: [{ path: 'test-file.md', content: 'Test content', metadata: { subject: 'MATH' } }],
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.processedFiles).toBe(1);
    expect(parseCurriculumFile).toHaveBeenCalledTimes(1);
    expect(mockIngestLogUpdate).toHaveBeenCalled();
  });

  it('returns 500 when file parsing fails', async () => {
    const { parseCurriculumFile } = await import('@/lib/curriculum/parser');
    vi.mocked(parseCurriculumFile).mockRejectedValueOnce(new Error('Parse error'));

    const { POST } = await import('@/app/api/ingest/route');
    const req = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer test_secret_123' },
      body: JSON.stringify({ source: 'WEBHOOK', files: [{ path: 'failing-file.md' }] }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Ingestion failed');
  });
});
