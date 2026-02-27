#!/usr/bin/env node
/**
 * publish-load-baseline.mjs
 *
 * Parses the latest k6 summary JSON and generates:
 *   docs/status/load-testing/slo-baseline-latest.md
 *
 * SLO targets (issue #176):
 *   - p50 response time < 200ms
 *   - p95 response time < 500ms
 *   - p99 response time < 1000ms
 *   - error rate < 1%
 *   - throughput (req/s) documented (no hard threshold for baseline run)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const summaryPath = join(repoRoot, 'k6-summary.json');
const outDir = join(repoRoot, 'docs/status/load-testing');
const outPath = join(outDir, 'slo-baseline-latest.md');

const scenario = process.env.SCENARIO ?? 'unknown';
const now = new Date().toISOString();

// SLO thresholds
const SLO = {
  p50Ms: 200,
  p95Ms: 500,
  p99Ms: 1000,
  errorRatePct: 1,
};

function pass(ok) {
  return ok ? '✅ PASS' : '❌ FAIL';
}

let summary;
try {
  summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
} catch {
  console.warn('k6-summary.json not found — writing placeholder report');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, `# SLO Baseline — ${scenario}\n\n_No k6 summary found. Run the load test workflow to generate baseline data._\n\nGenerated: ${now}\n`);
  process.exit(0);
}

// Extract metrics from k6 summary (k6 JSON summary format)
const metrics = summary.metrics ?? {};
const http = metrics.http_req_duration ?? {};
const httpFailed = metrics.http_req_failed ?? {};
const reqs = metrics.http_reqs ?? {};

const p50 = http?.values?.['p(50)'] ?? null;
const p95 = http?.values?.['p(95)'] ?? null;
const p99 = http?.values?.['p(99)'] ?? null;
const avgMs = http?.values?.avg ?? null;
const maxMs = http?.values?.max ?? null;
const errorRate = httpFailed?.values?.rate != null ? httpFailed.values.rate * 100 : null;
const reqRate = reqs?.values?.rate ?? null;

const p50Ok = p50 != null && p50 < SLO.p50Ms;
const p95Ok = p95 != null && p95 < SLO.p95Ms;
const p99Ok = p99 != null && p99 < SLO.p99Ms;
const errorOk = errorRate != null && errorRate < SLO.errorRatePct;

const allPass = p50Ok && p95Ok && p99Ok && errorOk;

const fmt = (v) => v != null ? `${v.toFixed(1)} ms` : 'n/a';
const fmtPct = (v) => v != null ? `${v.toFixed(2)}%` : 'n/a';
const fmtRps = (v) => v != null ? `${v.toFixed(1)} req/s` : 'n/a';

const md = `# SLO Baseline Report — ${scenario}

Generated: ${now}
Overall: ${allPass ? '✅ All SLOs met' : '❌ One or more SLOs missed'}

## Response Time SLOs

| Metric | Measured | Target | Status |
|--------|----------|--------|--------|
| p50 latency | ${fmt(p50)} | < ${SLO.p50Ms} ms | ${pass(p50Ok)} |
| p95 latency | ${fmt(p95)} | < ${SLO.p95Ms} ms | ${pass(p95Ok)} |
| p99 latency | ${fmt(p99)} | < ${SLO.p99Ms} ms | ${pass(p99Ok)} |
| Error rate | ${fmtPct(errorRate)} | < ${SLO.errorRatePct}% | ${pass(errorOk)} |

## Raw Metrics

| Metric | Value |
|--------|-------|
| Average response time | ${fmt(avgMs)} |
| Max response time | ${fmt(maxMs)} |
| Throughput | ${fmtRps(reqRate)} |

## SLO Targets (issue #176)

- **p50 < ${SLO.p50Ms} ms** — typical interactive response
- **p95 < ${SLO.p95Ms} ms** — tail latency guard
- **p99 < ${SLO.p99Ms} ms** — alert threshold in \`alerts.ts\`
- **Error rate < ${SLO.errorRatePct}%** — service availability floor
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, md);
console.log(`SLO baseline written to ${outPath}`);
if (!allPass) {
  console.error('One or more SLOs missed — see report above');
  process.exit(1);
}
