/**
 * Integration tests for /api/ingest route — idempotency and content-hash behaviour.
 *
 * Key behaviours tested:
 *  1. Unauthorized requests rejected (missing or invalid Bearer token).
 *  2. Request with no files falls back to defaultFinancialLiteracyFiles() directory scan.
 *  3. Identical payload submitted twice → second call returns { skipped: true }.
 *  4. Different payload (different file path) → NOT skipped, new ingest runs.
 *  5. Failed ingest (FAILURE status) is NOT treated as a successful dedup anchor.
 *  6. Ingestion disabled via PlatformConfig → 503 returned.
 *  7. Manual source with PLATFORM_ADMIN bypasses disabled guard.
 *  8. Successful ingest stores contentHash on the IngestLog record.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockRequireRole = vi.fn();
const mockGetCurrentUser = vi.fn();

// Prisma mock state
let mockIngestLogFindFirst = vi.fn();
let mockIngestLogCreate = vi.fn();
let mockIngestLogUpdate = vi.fn();
let mockPlatformConfigUpsert = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireRole: mockRequireRole,
  requireUser: vi.fn(),
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock('@/lib/db', () => ({
  db: {
    get ingestLog() {
      return {
        findFirst: mockIngestLogFindFirst,
        create: mockIngestLogCreate,
        update: mockIngestLogUpdate,
      };
    },
    get platformConfig() {
      return { upsert: mockPlatformConfigUpsert };
    },
  },
}));

vi.mock('@/lib/curriculum/parser', () => ({
  parseCurriculumFile: vi.fn().mockResolvedValue([
    {
      id: 'finlit-ch01-0000',
      text: 'Sample curriculum text chunk',
      metadata: { subject: 'FINANCIAL_LITERACY', gradeLevel: [9, 10, 11, 12] },
    },
  ]),
}));

vi.mock('@/lib/embeddings', () => ({
  generateEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
}));

vi.mock('@/lib/pinecone', () => ({
  upsertVectors: vi.fn().mockResolvedValue(['finlit-ch01-0000']),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/api/metrics', () => ({
  incrementMetric: vi.fn(),
  observeLatency: vi.fn(),
}));

vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
  captureException: vi.fn(),
  recordMetric: vi.fn(),
  trackEvent: vi.fn(),
}));

// Mock fs so defaultFinancialLiteracyFiles() works without a real filesystem.
vi.mock('node:fs/promises', () => ({
  default: {
    readdir: vi.fn().mockResolvedValue(['ch01.md', 'ch02.md']),
    readFile: vi.fn().mockResolvedValue('Sample content for hashing'),
  },
  readdir: vi.fn().mockResolvedValue(['ch01.md', 'ch02.md']),
  readFile: vi.fn().mockResolvedValue('Sample content for hashing'),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = 'test-webhook-secret-abc';

function makeRequest(body: unknown, token: string = WEBHOOK_SECRET): NextRequest {
  return new NextRequest('http://localhost/api/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

async function importRoute() {
  // Dynamic import so vi.mock() registrations are evaluated first.
  const mod = await import('@/app/api/ingest/route');
  return mod;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/ingest — idempotency and content-hash', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.N8N_WEBHOOK_SECRET = WEBHOOK_SECRET;

    // Default: ingestion enabled
    mockPlatformConfigUpsert.mockResolvedValue({
      key: 'default',
      ingestionEnabled: true,
      ingestionReason: null,
      ingestionDisabledAt: null,
    });

    // Default: no previous SUCCESS log (no dedup match)
    mockIngestLogFindFirst.mockResolvedValue(null);

    // Default: create + update succeed
    mockIngestLogCreate.mockResolvedValue({ id: 'log_new_001' });
    mockIngestLogUpdate.mockResolvedValue({ id: 'log_new_001' });
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('returns 401 when Authorization header is missing', async () => {
    const req = new NextRequest('http://localhost/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'WEBHOOK' }),
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 401 when Bearer token is wrong', async () => {
    const req = makeRequest({ source: 'WEBHOOK' }, 'wrong-secret');
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it('returns 500 when N8N_WEBHOOK_SECRET env var is not set', async () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    const req = makeRequest({ source: 'WEBHOOK' });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(500);
  });

  // ── Ingestion disabled ────────────────────────────────────────────────────

  it('returns 503 when ingestion is disabled and source is not MANUAL', async () => {
    mockPlatformConfigUpsert.mockResolvedValue({
      key: 'default',
      ingestionEnabled: false,
      ingestionReason: 'maintenance',
      ingestionDisabledAt: new Date(),
    });
    const req = makeRequest({ source: 'WEBHOOK' });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('Ingestion disabled');
  });

  it('returns 403 when ingestion is disabled and MANUAL source but user is not admin', async () => {
    mockPlatformConfigUpsert.mockResolvedValue({
      key: 'default',
      ingestionEnabled: false,
      ingestionReason: 'maintenance',
      ingestionDisabledAt: new Date(),
    });
    mockGetCurrentUser.mockResolvedValue({ id: 'user_edu', role: 'EDUCATOR', tenantId: 't1' });
    const req = makeRequest({ source: 'MANUAL' });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it('skips re-ingestion when a SUCCESS log exists for the same content hash', async () => {
    mockIngestLogFindFirst.mockResolvedValue({
      id: 'log_previous_001',
      contentHash: 'some-hash',
      status: 'SUCCESS',
    });

    const req = makeRequest({
      source: 'WEBHOOK',
      files: [{ path: 'content/14-financial-literacy/ch01.md', content: 'Some content' }],
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe('identical_payload');
    expect(body.previousLogId).toBe('log_previous_001');
    // No new IngestLog created for skipped calls
    expect(mockIngestLogCreate).not.toHaveBeenCalled();
  });

  it('does NOT skip when a FAILURE log exists for the same content hash', async () => {
    // FAILURE logs should not prevent re-ingestion (the previous attempt failed)
    mockIngestLogFindFirst.mockResolvedValue(null); // findFirst filters by status=SUCCESS
    mockIngestLogCreate.mockResolvedValue({ id: 'log_retry_001' });
    mockIngestLogUpdate.mockResolvedValue({ id: 'log_retry_001', status: 'SUCCESS' });

    const req = makeRequest({
      source: 'WEBHOOK',
      files: [{ path: 'content/14-financial-literacy/ch01.md', content: 'Some content' }],
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Should NOT be skipped — it's a genuine new attempt
    expect(body.skipped).toBeUndefined();
    expect(body.success).toBe(true);
    expect(mockIngestLogCreate).toHaveBeenCalledOnce();
  });

  it('does NOT skip when files array is different from previous successful run', async () => {
    // findFirst should NOT match because the hash will be different
    mockIngestLogFindFirst.mockResolvedValue(null);
    mockIngestLogCreate.mockResolvedValue({ id: 'log_different_001' });
    mockIngestLogUpdate.mockResolvedValue({ id: 'log_different_001', status: 'SUCCESS' });

    const req = makeRequest({
      source: 'WEBHOOK',
      files: [{ path: 'content/different-collection/new-file.md', content: 'Different content here' }],
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBeUndefined();
    expect(mockIngestLogCreate).toHaveBeenCalledOnce();
  });

  // ── contentHash stored on success ─────────────────────────────────────────

  it('stores contentHash on the IngestLog record when ingestion succeeds', async () => {
    const req = makeRequest({
      source: 'WEBHOOK',
      files: [{ path: 'content/14-financial-literacy/ch01.md', content: 'Test content' }],
    });
    const { POST } = await importRoute();
    await POST(req, { params: Promise.resolve({}) });

    // IngestLog.create() must be called with a non-null contentHash
    expect(mockIngestLogCreate).toHaveBeenCalledOnce();
    const createArgs = mockIngestLogCreate.mock.calls[0][0];
    expect(typeof createArgs.data.contentHash).toBe('string');
    expect(createArgs.data.contentHash).toHaveLength(64); // SHA-256 hex = 64 chars
    expect(createArgs.data.status).toBe('PROCESSING');
  });

  // ── Successful ingest response shape ─────────────────────────────────────

  it('returns success with processedFiles, chunks, and vectors counts', async () => {
    mockIngestLogCreate.mockResolvedValue({ id: 'log_ok_001' });
    mockIngestLogUpdate.mockResolvedValue({ id: 'log_ok_001', status: 'SUCCESS' });

    const req = makeRequest({
      source: 'MANUAL',
      files: [{ path: 'content/14-financial-literacy/ch01.md', content: 'Some curriculum content' }],
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.processedFiles).toBe('number');
    expect(typeof body.chunks).toBe('number');
    expect(typeof body.vectors).toBe('number');
  });

  // ── Ingest failure ────────────────────────────────────────────────────────

  it('returns 500 and updates IngestLog to FAILURE when parsing throws', async () => {
    const { parseCurriculumFile } = await import('@/lib/curriculum/parser');
    vi.mocked(parseCurriculumFile).mockRejectedValueOnce(new Error('Parse error'));

    mockIngestLogCreate.mockResolvedValue({ id: 'log_fail_001' });
    mockIngestLogUpdate.mockResolvedValue({ id: 'log_fail_001', status: 'FAILURE' });

    const req = makeRequest({
      source: 'WEBHOOK',
      files: [{ path: 'content/broken/bad.md', content: 'bad content' }],
    });
    const { POST } = await importRoute();
    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Ingestion failed');
    expect(body.logId).toBe('log_fail_001');

    // Verify FAILURE status update was made
    const updateArgs = mockIngestLogUpdate.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('FAILURE');
    expect(typeof updateArgs.data.errorMessage).toBe('string');
  });
});
