import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '../api-handler';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../api-errors';
import { resetAllRateLimits } from '../rate-limit';

// Silence logger output in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
}));

function makeRequest(
  path = '/api/test',
  init?: ConstructorParameters<typeof NextRequest>[1],
) {
  const url = `http://localhost${path}`;
  return new NextRequest(url, init);
}

function makeRouteContext(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

beforeEach(() => {
  resetAllRateLimits();
});

describe('withApiHandler', () => {
  describe('success responses', () => {
    it('passes through a NextResponse from the handler', async () => {
      const handler = withApiHandler(async () => {
        return NextResponse.json({ data: 'ok' });
      });

      const res = await handler(makeRequest(), makeRouteContext());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toBe('ok');
      expect(res.headers.get('X-Request-Id')).toBeTruthy();
    });

    it('passes through a streaming Response from the handler', async () => {
      const handler = withApiHandler(async () => {
        return new Response('stream', {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      });

      const res = await handler(makeRequest(), makeRouteContext());
      expect(res.headers.get('Content-Type')).toBe('text/event-stream');
      expect(res.headers.get('X-Request-Id')).toBeTruthy();
    });

    it('forwards an existing X-Request-Id header', async () => {
      const handler = withApiHandler(async (_req, { requestId }) => {
        return NextResponse.json({ requestId });
      });

      const res = await handler(
        makeRequest('/api/test', {
          headers: { 'x-request-id': 'custom-id-123' },
        }),
        makeRouteContext(),
      );
      const body = await res.json();

      expect(body.requestId).toBe('custom-id-123');
      expect(res.headers.get('X-Request-Id')).toBe('custom-id-123');
    });
  });

  describe('error handling', () => {
    it('converts AuthenticationError to 401 JSON', async () => {
      const handler = withApiHandler(async () => {
        throw new AuthenticationError();
      });

      const res = await handler(makeRequest(), makeRouteContext());
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
      expect(body.code).toBe('AUTHENTICATION_ERROR');
      expect(body.requestId).toBeTruthy();
    });

    it('converts ForbiddenError to 403 JSON', async () => {
      const handler = withApiHandler(async () => {
        throw new ForbiddenError('Not your resource');
      });

      const res = await handler(makeRequest(), makeRouteContext());
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error).toBe('Not your resource');
      expect(body.code).toBe('FORBIDDEN');
    });

    it('converts NotFoundError to 404 JSON', async () => {
      const handler = withApiHandler(async () => {
        throw new NotFoundError('Session not found');
      });

      const res = await handler(makeRequest(), makeRouteContext());
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('Session not found');
      expect(body.code).toBe('NOT_FOUND');
    });

    it('converts ValidationError to 400 JSON with details', async () => {
      const handler = withApiHandler(async () => {
        throw new ValidationError('Bad input', [
          { field: 'email', message: 'required' },
        ]);
      });

      const res = await handler(makeRequest(), makeRouteContext());
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('Bad input');
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details).toEqual([{ field: 'email', message: 'required' }]);
    });

    it('catches ZodErrors and returns 400 with field-level details', async () => {
      const { z } = await import('zod');

      const handler = withApiHandler(async () => {
        z.object({ name: z.string() }).parse({});
        return NextResponse.json({ ok: true });
      });

      const res = await handler(makeRequest(), makeRouteContext());
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'name', message: expect.any(String) }),
        ]),
      );
    });

    it('catches unexpected errors and returns 500', async () => {
      const handler = withApiHandler(async () => {
        throw new TypeError('unexpected');
      });

      const res = await handler(makeRequest(), makeRouteContext());
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Internal server error');
      expect(body.code).toBe('INTERNAL_ERROR');
      expect(body.requestId).toBeTruthy();
    });
  });

  describe('rate limiting', () => {
    it('allows requests within limit', async () => {
      const handler = withApiHandler(
        async () => NextResponse.json({ ok: true }),
        { rateLimit: { windowMs: 60_000, max: 2 } },
      );

      const req = makeRequest('/api/limited', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });

      const r1 = await handler(req, makeRouteContext());
      expect(r1.status).toBe(200);

      const r2 = await handler(req, makeRouteContext());
      expect(r2.status).toBe(200);
    });

    it('returns 429 when rate limit exceeded', async () => {
      const handler = withApiHandler(
        async () => NextResponse.json({ ok: true }),
        { rateLimit: { windowMs: 60_000, max: 1 } },
      );

      const req = makeRequest('/api/limited', {
        headers: { 'x-forwarded-for': '5.6.7.8' },
      });

      const r1 = await handler(req, makeRouteContext());
      expect(r1.status).toBe(200);

      const r2 = await handler(req, makeRouteContext());
      expect(r2.status).toBe(429);

      const body = await r2.json();
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(r2.headers.get('Retry-After')).toBeTruthy();
      expect(r2.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('does not rate-limit without config', async () => {
      const handler = withApiHandler(async () =>
        NextResponse.json({ ok: true }),
      );

      const req = makeRequest('/api/unlimited', {
        headers: { 'x-forwarded-for': '9.9.9.9' },
      });

      for (let i = 0; i < 100; i++) {
        const res = await handler(req, makeRouteContext());
        expect(res.status).toBe(200);
      }
    });
  });

  describe('context', () => {
    it('resolves dynamic route params from routeContext', async () => {
      const handler = withApiHandler(async (_req, ctx) => {
        return NextResponse.json({ id: ctx.params.id });
      });

      const res = await handler(makeRequest('/api/items/42'), {
        params: Promise.resolve({ id: '42' }),
      });
      const body = await res.json();

      expect(body.id).toBe('42');
    });

    it('provides empty params when no params are given', async () => {
      const handler = withApiHandler(async (_req, ctx) => {
        return NextResponse.json({ params: ctx.params });
      });

      const res = await handler(makeRequest(), makeRouteContext());
      const body = await res.json();

      expect(body.params).toEqual({});
    });
  });
});
