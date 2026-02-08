import { access } from 'node:fs/promises';

const requiredFiles = [
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/data-retention/page.tsx',
  'src/app/educator/compliance/page.tsx',
  'COMPLIANCE.md',
];

const requiredEnv = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'CLERK_SECRET_KEY',
  'STRIPE_SECRET_KEY',
];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    console.error(`Missing compliance artifact: ${file}`);
    process.exit(1);
  }
}

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.warn(`Missing env vars for full compliance validation: ${missingEnv.join(', ')}`);
}

console.log('Compliance artifacts validated.');
