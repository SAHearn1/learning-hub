import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/about(.*)",
  "/methodology(.*)",
  "/pricing(.*)",
  "/contact(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const RATE_LIMIT_MAX_ENTRIES = 10_000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const isApiRoute = (pathname: string) => pathname.startsWith("/api/");
const isWebhookRoute = (pathname: string) => pathname.startsWith("/api/webhooks/");
const isMutatingMethod = (method: string) => ["POST", "PUT", "PATCH", "DELETE"].includes(method);

const applyTransportSecurityHeaders = (response: NextResponse) => {
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
};


const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
};

const pruneRateLimitStore = (now: number) => {
  if (rateLimitStore.size <= RATE_LIMIT_MAX_ENTRIES) return;
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
};

/**
 * Rate limiter using in-memory sliding window.
 *
 * For multi-instance deployments, the server-side Redis rate limiter
 * (`src/lib/redis/cache.ts#rateLimitCheck`) provides distributed
 * enforcement. This in-memory fallback keeps the Edge middleware
 * functional without a Redis dependency (Edge Runtime cannot use ioredis).
 */
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
      { error: "Too many requests", retryAfterMs: current.resetAt - now },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((current.resetAt - now) / 1000).toString(),
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

  const origin = request.headers.get("origin");
  if (!origin) {
    return NextResponse.json({ error: "Missing origin header" }, { status: 403 });
  }

  if (origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  return null;
};

export default clerkMiddleware((auth, req) => {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto && proto !== "https") {
    return NextResponse.json({ error: "HTTPS required" }, { status: 426 });
  }

  const rateLimitResponse = enforceRateLimit(req);
  if (rateLimitResponse) {
    return applyTransportSecurityHeaders(rateLimitResponse);
  }

  const csrfResponse = enforceCsrfForApi(req);
  if (csrfResponse) {
    return applyTransportSecurityHeaders(csrfResponse);
  }

  if (!isPublicRoute(req)) {
    auth().protect();
  }

  return applyTransportSecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
