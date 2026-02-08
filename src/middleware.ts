import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientKey } from '@/lib/api/rate-limit';
import { incrementMetric } from '@/lib/api/metrics';
import { logger } from '@/lib/logger';

const API_RATE_LIMIT = Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 120);

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null;
  const key = getClientKey(ip, req.nextUrl.pathname);
  const rateLimit = checkRateLimit(key, API_RATE_LIMIT);

  if (!rateLimit.allowed) {
    incrementMetric('api_rate_limit_block_total');
    logger.warn('API rate limit exceeded', {
      ip,
      path: req.nextUrl.pathname,
      limit: API_RATE_LIMIT,
    });

    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt / 1000)),
        },
      },
    );
  }

  incrementMetric('api_request_total');
  logger.info('API request', {
    method: req.method,
    path: req.nextUrl.pathname,
    ip,
  });

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(rateLimit.resetAt / 1000)));

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
