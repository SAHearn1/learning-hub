/**
 * Verifies the Pinecone index is healthy and reports per-namespace stats.
 *
 * Usage:
 *   npm run rag:verify
 *   npx tsx scripts/verify-pinecone-index.ts
 *
 * Environment:
 *   PINECONE_API_KEY  — required
 *   PINECONE_INDEX    — optional, defaults to "rootwork-curriculum"
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { EMBEDDING_DIMENSIONS } from '../src/lib/embeddings';

const INDEX_NAME = process.env.PINECONE_INDEX || 'rootwork-curriculum';
const DIMENSION = EMBEDDING_DIMENSIONS;
const NAMESPACES = ['standards', 'topics', 'problems', 'supplementary'] as const;

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error('Error: PINECONE_API_KEY is not set');
    process.exit(1);
  }

  const pc = new Pinecone({ apiKey });
  console.log(`\n=== Pinecone Index Health Check: ${INDEX_NAME} ===\n`);

  // ── Check index exists ─────────────────────────────────────────
  const existing = await pc.listIndexes();
  const indexNames = existing.indexes?.map(i => i.name) ?? [];

  if (!indexNames.includes(INDEX_NAME)) {
    console.error(`Index "${INDEX_NAME}" does not exist.`);
    console.error('Run: npm run rag:create-index');
    process.exit(1);
  }

  // ── Describe index ─────────────────────────────────────────────
  const desc = await pc.describeIndex(INDEX_NAME);
  const ready = desc.status?.ready ?? false;
  const dim = desc.dimension;
  const met = desc.metric;

  console.log(`Status:    ${ready ? 'READY' : 'NOT READY'}`);
  console.log(`Dimension: ${dim}${dim === DIMENSION ? '' : ` (expected ${DIMENSION})`}`);
  console.log(`Metric:    ${met}`);
  console.log(`Host:      ${desc.host ?? 'unknown'}`);

  if (!ready) {
    console.error('\nIndex is not ready. Wait and try again.');
    process.exit(1);
  }

  if (dim !== DIMENSION) {
    console.error(`\nDimension mismatch! Expected ${DIMENSION}, got ${dim}.`);
    process.exit(1);
  }

  // ── Namespace stats ────────────────────────────────────────────
  const index = pc.index(INDEX_NAME);
  const stats = await index.describeIndexStats();
  const totalVectors = stats.totalRecordCount ?? 0;

  console.log(`\nTotal vectors: ${totalVectors}`);
  console.log('');
  console.log('Namespace stats:');
  console.log('  +─────────────────+──────────+──────────────────────────+');
  console.log('  | Namespace       | Vectors  | Status                   |');
  console.log('  +─────────────────+──────────+──────────────────────────+');

  const populatedNs = stats.namespaces || {};
  for (const ns of NAMESPACES) {
    const count = populatedNs[ns]?.recordCount ?? 0;
    const status = count > 0 ? 'populated' : 'empty (awaiting ingest)';
    console.log(`  | ${ns.padEnd(15)} | ${String(count).padStart(8)} | ${status.padEnd(24)} |`);
  }

  // Report any unexpected namespaces
  const known = new Set<string>([...NAMESPACES, '_test']);
  const unknown = Object.keys(populatedNs).filter(ns => !known.has(ns));
  for (const ns of unknown) {
    const count = populatedNs[ns]?.recordCount ?? 0;
    console.log(`  | ${ns.padEnd(15)} | ${String(count).padStart(8)} | ${'(unexpected)'.padEnd(24)} |`);
  }

  console.log('  +─────────────────+──────────+──────────────────────────+');

  // ── Upsert + query test ────────────────────────────────────────
  console.log('\nRunning upsert/query test...');

  const testNs = index.namespace('_test');
  const testId = '_health_check';
  const testVector = Array.from({ length: DIMENSION }, (_, i) => Math.cos(i * 0.1) * 0.5);

  try {
    const t0 = Date.now();
    await testNs.upsert({
      records: [{
        id: testId,
        values: testVector,
        metadata: { text: 'health check', type: 'test' },
      }],
    });
    const upsertMs = Date.now() - t0;

    await new Promise(r => setTimeout(r, 1000));

    const t1 = Date.now();
    const result = await testNs.query({
      vector: testVector,
      topK: 1,
      includeMetadata: true,
    });
    const queryMs = Date.now() - t1;

    const matched = result.matches.length > 0 && result.matches[0].id === testId;
    const score = result.matches[0]?.score?.toFixed(4) ?? 'N/A';

    console.log(`  Upsert:  ${upsertMs}ms`);
    console.log(`  Query:   ${queryMs}ms (score: ${score})`);
    console.log(`  Match:   ${matched ? 'OK' : 'FAILED'}`);

    await testNs.deleteOne({ id: testId });
    console.log('  Cleanup: OK');
  } catch (err) {
    console.error('  Test failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n=== Health Check Passed ===\n');
}

main().catch(err => {
  console.error('Health check failed:', err);
  process.exit(1);
});
