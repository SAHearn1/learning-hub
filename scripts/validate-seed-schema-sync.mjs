#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const schemaPath = path.join(repoRoot, 'prisma/schema.prisma');
const seedPath = path.join(repoRoot, 'prisma/seed.ts');

const schema = fs.readFileSync(schemaPath, 'utf8');
const seed = fs.readFileSync(seedPath, 'utf8');

const modelNames = [...schema.matchAll(/^model\s+(\w+)\s+\{/gm)].map((m) => m[1]);
const delegates = new Set(modelNames.map((m) => m.charAt(0).toLowerCase() + m.slice(1)));

const usedDelegates = [...seed.matchAll(/prisma\.(\w+)\./g)]
  .map((m) => m[1])
  .filter((name) => !name.startsWith('$'));

const unknown = [...new Set(usedDelegates.filter((delegate) => !delegates.has(delegate)))];

if (unknown.length > 0) {
  console.error('❌ Seed schema sync check failed. Unknown Prisma delegates found:');
  for (const name of unknown) {
    console.error(`   - prisma.${name}`);
  }
  process.exit(1);
}

console.log('✅ Seed schema sync check passed. All Prisma delegates used in prisma/seed.ts exist in prisma/schema.prisma models.');
