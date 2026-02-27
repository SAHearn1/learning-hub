import fs from 'node:fs';
import path from 'node:path';

const resultsDir = path.resolve('tests/load/results');
const outFile = path.resolve('docs/status/load-testing/slo-baseline-latest.md');

const summaries = fs
  .readdirSync(resultsDir)
  .filter((file) => file.startsWith('summary-') && file.endsWith('.json'))
  .sort();

if (summaries.length === 0) {
  throw new Error('No load test summary files found in tests/load/results.');
}

const latest = summaries[summaries.length - 1];
const summaryPath = path.join(resultsDir, latest);
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

const pick = (obj, fallback = 'n/a') => (obj ?? fallback);
const metric = (name) => summary.metrics?.[name]?.values ?? {};

const req = metric('http_req_duration');
const failed = metric('http_req_failed');
const rps = metric('http_reqs');

const now = new Date().toISOString();
const content = `# SLO Baseline (Latest)\n\n- Generated at: ${now}\n- Source summary: \`${summaryPath.replace(process.cwd() + '/', '')}\`\n\n## Measured Baseline\n\n| Metric | Baseline | Target | Status |\n|---|---:|---:|---|\n| p95 latency (http_req_duration) | ${pick(req['p(95)'])} ms | < 500 ms | ${Number(req['p(95)']) < 500 ? 'PASS' : 'FAIL'} |\n| p99 latency (http_req_duration) | ${pick(req['p(99)'])} ms | < 1000 ms | ${Number(req['p(99)']) < 1000 ? 'PASS' : 'FAIL'} |\n| error rate (http_req_failed.rate) | ${pick(failed.rate)} | < 0.01 | ${Number(failed.rate) < 0.01 ? 'PASS' : 'FAIL'} |\n| throughput (http_reqs.rate) | ${pick(rps.rate)} req/s | > 50 req/s | ${Number(rps.rate) > 50 ? 'PASS' : 'FAIL'} |\n\n## Raw Extract\n\n\`\`\`json\n${JSON.stringify({
  http_req_duration: req,
  http_req_failed: failed,
  http_reqs: rps,
}, null, 2)}\n\`\`\`\n`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, content);
console.log(`Wrote ${outFile}`);
