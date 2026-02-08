/**
 * Creates and verifies the Pinecone index for the RootWork curriculum RAG system.
 *
 * Usage:
 *   npm run rag:create-index
 *   npx tsx scripts/create-pinecone-index.ts
 *
 * Requires:
 *   PINECONE_API_KEY in .env
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { EMBEDDING_DIMENSIONS } from '../src/lib/embeddings';

const INDEX_NAME = process.env.PINECONE_INDEX || 'rootwork-curriculum';
const DIMENSION = EMBEDDING_DIMENSIONS;
const NAMESPACES = ['standards', 'topics', 'problems', 'supplementary'] as const;

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error('Error: PINECONE_API_KEY is not set in .env');
    process.exit(1);
  }

  const pc = new Pinecone({ apiKey });

  // Check if index already exists
  const existing = await pc.listIndexes();
  const indexNames = existing.indexes?.map(i => i.name) ?? [];

  if (indexNames.includes(INDEX_NAME)) {
    console.log(`Index "${INDEX_NAME}" already exists. Validating...`);
    const desc = await pc.describeIndex(INDEX_NAME);

    if (desc.dimension !== DIMENSION) {
      console.error(
        `Dimension mismatch: index has ${desc.dimension}, expected ${DIMENSION}.`,
      );
      console.error('Delete the index and re-run this script, or update EMBEDDING_DIMENSIONS.');
      process.exit(1);
    }
    if (desc.metric !== 'cosine') {
      console.error(
        `Metric mismatch: index uses "${desc.metric}", expected "cosine".`,
      );
      process.exit(1);
    }

    console.log('Index configuration matches. Checking namespace stats...');
  } else {
    console.log(`Creating index "${INDEX_NAME}" (${DIMENSION}d, cosine, aws/us-east-1)...`);

    await pc.createIndex({
      name: INDEX_NAME,
      dimension: DIMENSION,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });

    // Poll until ready
    let ready = false;
    for (let i = 0; i < 30; i++) {
      const desc = await pc.describeIndex(INDEX_NAME);
      if (desc.status?.ready) {
        ready = true;
        break;
      }
      process.stdout.write('.');
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!ready) {
      console.error('\nIndex created but not ready after 60s. Check Pinecone dashboard.');
      process.exit(1);
    }
    console.log('\nIndex is ready.');
  }

  // Report namespace stats
  const index = pc.index(INDEX_NAME);
  const stats = await index.describeIndexStats();
  const totalVectors = stats.totalRecordCount ?? 0;

  console.log(`\nTotal vectors: ${totalVectors}`);
  console.log('\nExpected namespaces:');
  const populatedNs = stats.namespaces || {};
  for (const ns of NAMESPACES) {
    const count = populatedNs[ns]?.recordCount ?? 0;
    const status = count > 0 ? `${count} vectors` : 'empty (awaiting ingest)';
    console.log(`  ${ns}: ${status}`);
  }

  // Quick upsert/query verification
  console.log('\nRunning verification test...');
  const testNs = index.namespace('_test');
  const testId = '_setup_verify';
  const testVector = Array.from({ length: DIMENSION }, (_, i) => Math.sin(i * 0.1) * 0.5);

  try {
    await testNs.upsert({
      records: [{
        id: testId,
        values: testVector,
        metadata: { text: 'setup verification', type: 'test' },
      }],
    });

    await new Promise(r => setTimeout(r, 1000));

    const result = await testNs.query({
      vector: testVector,
      topK: 1,
      includeMetadata: true,
    });

    const matched = result.matches.length > 0 && result.matches[0].id === testId;
    console.log(`  Upsert + Query: ${matched ? 'OK' : 'FAILED'}`);

    await testNs.deleteOne({ id: testId });
    console.log('  Cleanup: OK');
  } catch (err) {
    console.error('  Verification failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log(`\nPinecone index "${INDEX_NAME}" is ready for ingestion.`);
  console.log('Next steps:');
  console.log('  1. Ingest curriculum files: POST /api/ingest');
  console.log('  2. Verify health: npm run rag:verify');
}

main().catch(err => {
  console.error('Failed to create Pinecone index:', err);
  process.exit(1);
});
