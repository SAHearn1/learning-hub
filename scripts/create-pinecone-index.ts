/**
 * Creates the Pinecone index for the RootWork curriculum RAG system.
 *
 * Usage:
 *   npx tsx scripts/create-pinecone-index.ts
 *
 * Requires:
 *   PINECONE_API_KEY in .env
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { EMBEDDING_DIMENSIONS } from '../src/lib/embeddings';

async function main() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.error('Error: PINECONE_API_KEY is not set in .env');
    process.exit(1);
  }

  const indexName = process.env.PINECONE_INDEX || 'rootwork-curriculum';
  const pc = new Pinecone({ apiKey });

  // Check if index already exists
  const existing = await pc.listIndexes();
  const indexNames = existing.indexes?.map(i => i.name) ?? [];

  if (indexNames.includes(indexName)) {
    console.log(`Index "${indexName}" already exists.`);
    const desc = await pc.describeIndex(indexName);
    console.log('Index details:', JSON.stringify(desc, null, 2));
    return;
  }

  console.log(`Creating index "${indexName}" with ${EMBEDDING_DIMENSIONS} dimensions...`);

  await pc.createIndex({
    name: indexName,
    dimension: EMBEDDING_DIMENSIONS,
    metric: 'cosine',
    spec: {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1',
      },
    },
  });

  console.log(`Index "${indexName}" created successfully.`);
  console.log('Waiting for index to be ready...');

  // Poll until ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    const desc = await pc.describeIndex(indexName);
    if (desc.status?.ready) {
      ready = true;
      console.log('Index is ready!');
      console.log('Details:', JSON.stringify(desc, null, 2));
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  if (!ready) {
    console.log('Index creation initiated but not yet ready. Check Pinecone dashboard.');
  }
}

main().catch(err => {
  console.error('Failed to create Pinecone index:', err);
  process.exit(1);
});
