/**
 * Smoke Test — validates a deployed Learning Hub instance is healthy.
 *
 * Usage:
 *   SMOKE_TEST_URL=https://<preview>.vercel.app npx ts-node scripts/smoke-test.ts
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 *
 * See docs/RELEASE_GATES.md § Gate 6 for context.
 */

const BASE_URL = process.env.SMOKE_TEST_URL ?? 'http://localhost:3000';
const TIMEOUT_MS = 30_000;

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function runCheck(name: string, fn: () => Promise<void>): Promise<CheckResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, passed: true, message: 'OK', durationMs: Date.now() - start };
  } catch (err) {
    return {
      name,
      passed: false,
      message: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

async function checkHealth(): Promise<void> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
  if (res.status !== 200) {
    throw new Error(`Expected 200, got ${res.status}`);
  }
  const body = (await res.json()) as Record<string, unknown>;
  if (body.status !== 'ok') {
    throw new Error(`Expected status "ok", got "${body.status}"`);
  }
}

async function checkHealthDb(): Promise<void> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/health`);
  const body = (await res.json()) as Record<string, unknown>;
  if (body.db !== 'ok') {
    throw new Error(`Expected db "ok", got "${body.db}" — check DATABASE_URL`);
  }
}

async function checkHomepage(): Promise<void> {
  const res = await fetchWithTimeout(`${BASE_URL}/`);
  if (res.status !== 200) {
    throw new Error(`Expected 200, got ${res.status}`);
  }
  const text = await res.text();
  if (!text.includes('<html')) {
    throw new Error('Response does not look like HTML');
  }
}

async function checkSignIn(): Promise<void> {
  const res = await fetchWithTimeout(`${BASE_URL}/sign-in`);
  // Clerk may redirect to its own hosted page — 200 or 302 both acceptable
  if (res.status !== 200 && res.status !== 302) {
    throw new Error(`Expected 200 or 302, got ${res.status}`);
  }
}

async function checkWebhookReachable(): Promise<void> {
  // GET on a POST-only webhook endpoint should return 405 (not 404 or 500)
  const res = await fetchWithTimeout(`${BASE_URL}/api/webhooks/clerk`, { method: 'GET' });
  if (res.status === 404) {
    throw new Error('Webhook route returned 404 — route may be missing');
  }
  if (res.status === 500) {
    throw new Error('Webhook route returned 500 — internal error');
  }
  // 405 or 400 (missing signature) are both acceptable "route exists" signals
}

async function checkSecurityHeaders(): Promise<void> {
  const res = await fetchWithTimeout(`${BASE_URL}/`);
  const csp = res.headers.get('content-security-policy') ?? '';
  if (csp.includes('unsafe-eval')) {
    throw new Error("CSP contains 'unsafe-eval' — security regression");
  }
  const frameOptions = res.headers.get('x-frame-options') ?? '';
  if (!frameOptions.toLowerCase().includes('deny')) {
    throw new Error(`X-Frame-Options should be DENY, got "${frameOptions}"`);
  }
  const cto = res.headers.get('x-content-type-options') ?? '';
  if (!cto.toLowerCase().includes('nosniff')) {
    throw new Error(`X-Content-Type-Options should be nosniff, got "${cto}"`);
  }
}

async function checkStripeWebhookReachable(): Promise<void> {
  const res = await fetchWithTimeout(`${BASE_URL}/api/stripe/webhook`, { method: 'GET' });
  if (res.status === 404) {
    throw new Error('Stripe webhook route returned 404');
  }
  if (res.status === 500) {
    throw new Error('Stripe webhook route returned 500');
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\nSmoke Test — ${BASE_URL}`);
  console.log('='.repeat(60));

  const checks: Array<[string, () => Promise<void>]> = [
    ['Health endpoint responds 200', checkHealth],
    ['Health endpoint: DB connected', checkHealthDb],
    ['Homepage renders HTML', checkHomepage],
    ['Sign-in page reachable', checkSignIn],
    ['Clerk webhook route reachable', checkWebhookReachable],
    ['Stripe webhook route reachable', checkStripeWebhookReachable],
    ['Security headers present and correct', checkSecurityHeaders],
  ];

  const results: CheckResult[] = [];
  for (const [name, fn] of checks) {
    const result = await runCheck(name, fn);
    results.push(result);
    const icon = result.passed ? '✓' : '✗';
    const duration = `${result.durationMs}ms`;
    console.log(`  ${icon} [${duration.padStart(6)}]  ${result.name}`);
    if (!result.passed) {
      console.log(`           └─ ${result.message}`);
    }
  }

  const failed = results.filter((r) => !r.passed);
  const totalMs = results.reduce((s, r) => s + r.durationMs, 0);

  console.log('='.repeat(60));
  console.log(`Results: ${results.length - failed.length}/${results.length} passed  (${totalMs}ms total)\n`);

  if (failed.length > 0) {
    console.error(`SMOKE TEST FAILED — ${failed.length} check(s) failed`);
    process.exit(1);
  } else {
    console.log('SMOKE TEST PASSED');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
