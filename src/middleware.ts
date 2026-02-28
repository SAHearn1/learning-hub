import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/about(.*)',
  '/methodology(.*)',
  '/curriculum(.*)',
  '/community(.*)',
  '/pricing(.*)',
  '/contact(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/onboarding(.*)',
  '/api/health',
  '/api/webhooks(.*)',
]);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 120);
// Per-user (tenant-proxy) rate limit: authenticated API calls per minute
const TENANT_RATE_LIMIT_MAX = Number(process.env.TENANT_RATE_LIMIT_PER_MINUTE ?? 200);
const RATE_LIMIT_MAX_ENTRIES = 10_000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const tenantRateLimitStore = new Map<string, { count: number; resetAt: number }>();

const isApiRoute = (pathname: string) => pathname.startsWith('/api/');
const isWebhookRoute = (pathname: string) => pathname.startsWith('/api/webhooks/');
const isMutatingMethod = (method: string) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
};

const pruneRateLimitStore = (now: number) => {
  if (rateLimitStore.size <= RATE_LIMIT_MAX_ENTRIES) return;
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
};

// Prune expired entries from the tenant rate-limit store to prevent unbounded
// memory growth in long-running serverless instances (mirror of pruneRateLimitStore).
const pruneTenantRateLimitStore = (now: number) => {
  if (tenantRateLimitStore.size <= RATE_LIMIT_MAX_ENTRIES) return;
  for (const [key, entry] of tenantRateLimitStore) {
    if (now >= entry.resetAt) {
      tenantRateLimitStore.delete(key);
    }
  }
};

const enforceRateLimit = (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;
  if (!isApiRoute(pathname) || isWebhookRoute(pathname)) {
    return null;
  }

  const now = Date.now();
  pruneRateLimitStore(now);

  const key = `${getClientIp(request)}:${pathname}`;
  const current = rateLimitStore.get(key);

  if (!current || now >= current.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterMs: current.resetAt - now },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((current.resetAt - now) / 1000).toString(),
        },
      },
    );
  }

  current.count += 1;
  return null;
};

const enforceCsrfForApi = (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;
  if (!isApiRoute(pathname) || isWebhookRoute(pathname) || !isMutatingMethod(request.method)) {
    return null;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    return NextResponse.json({ error: 'Missing origin header' }, { status: 403 });
  }

  if (origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  return null;
};

const applySecurityHeaders = (response: NextResponse) => {
  // HSTS is set to max-age=63072000 (2 years) in next.config.js for static routes.
  // Do NOT set it here: middleware runs after next.config.js headers are applied and
  // would overwrite with a shorter max-age, weakening the preload directive.
  // X-Content-Type-Options and X-Frame-Options are also set in next.config.js;
  // repeating them here is harmless but we keep them as a defence-in-depth fallback
  // for any response paths that bypass the static header config (e.g. streaming).
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
};

const enforceTenantRateLimit = (request: NextRequest, tenantKey: string | null) => {
  const pathname = request.nextUrl.pathname;
  if (!isApiRoute(pathname) || isWebhookRoute(pathname) || !tenantKey) return null;

  const now = Date.now();
  pruneTenantRateLimitStore(now);
  const key = `tenant:${tenantKey}`;
  const current = tenantRateLimitStore.get(key);

  if (!current || now >= current.resetAt) {
    tenantRateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  if (current.count >= TENANT_RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: 'Tenant rate limit exceeded', code: 'TENANT_RATE_LIMIT_EXCEEDED', retryAfterMs: current.resetAt - now },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((current.resetAt - now) / 1000).toString(),
          'X-RateLimit-Scope': 'tenant',
        },
      },
    );
  }

  current.count += 1;
  return null;
};

export default clerkMiddleware((auth, req) => {
  // Rate limiting for API routes
  const rateLimitResponse = enforceRateLimit(req);
  if (rateLimitResponse) {
    return applySecurityHeaders(rateLimitResponse);
  }

  // Per-tenant rate limiting for authenticated API routes.
  // Uses tenantId from Clerk session claims (publicMetadata) when available,
  // so all users in the same tenant share one rate-limit bucket.
  // Falls back to userId for users whose metadata hasn't synced yet.
  const { userId, sessionClaims } = auth();
  const tenantId = (sessionClaims?.publicMetadata as Record<string, string> | undefined)?.tenantId ?? userId;
  const tenantRateLimitResponse = enforceTenantRateLimit(req, tenantId);
  if (tenantRateLimitResponse) {
    return applySecurityHeaders(tenantRateLimitResponse);
  }

  // CSRF protection for mutating API requests
  const csrfResponse = enforceCsrfForApi(req);
  if (csrfResponse) {
    return applySecurityHeaders(csrfResponse);
  }

  // Protect non-public routes — redirects unauthenticated users to sign-in
  if (!isPublicRoute(req)) {
    auth().protect();
  }

  return applySecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
