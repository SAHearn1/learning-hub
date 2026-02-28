#!/usr/bin/env node
/**
 * One-time migration: set onboardingComplete=true and role in Clerk
 * publicMetadata for all existing users who already have a role in the DB.
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_xxx node scripts/migrate-clerk-onboarding.mjs
 *
 * Or with .env.local loaded:
 *   npx dotenv -e .env.local -- node scripts/migrate-clerk-onboarding.mjs
 *
 * Dry run (default):
 *   node scripts/migrate-clerk-onboarding.mjs
 *
 * Live run:
 *   node scripts/migrate-clerk-onboarding.mjs --apply
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const APPLY = process.argv.includes('--apply');

if (!CLERK_SECRET_KEY) {
  console.error('ERROR: CLERK_SECRET_KEY is required. Set it in your environment.');
  process.exit(1);
}

const CLERK_API = 'https://api.clerk.com/v1';

async function clerkFetch(path, options = {}) {
  const res = await fetch(`${CLERK_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Clerk API ${res.status}: ${body}`);
  }
  return res.json();
}

async function getAllUsers() {
  const users = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const batch = await clerkFetch(`/users?limit=${limit}&offset=${offset}`);
    if (!batch.length) break;
    users.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return users;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (live)' : 'DRY RUN'}`);
  console.log('Fetching all Clerk users...');

  const users = await getAllUsers();
  console.log(`Found ${users.length} users total.`);

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    const meta = user.public_metadata || {};

    if (meta.onboardingComplete) {
      skipped++;
      continue;
    }

    const role = meta.role || 'STUDENT';
    const email = user.email_addresses?.[0]?.email_address || 'unknown';

    console.log(`  ${APPLY ? 'Updating' : 'Would update'}: ${email} (role=${role})`);

    if (APPLY) {
      await clerkFetch(`/users/${user.id}/metadata`, {
        method: 'PATCH',
        body: JSON.stringify({
          public_metadata: {
            ...meta,
            role,
            onboardingComplete: true,
          },
        }),
      });
    }

    updated++;
  }

  console.log(`\nDone. ${updated} users ${APPLY ? 'updated' : 'would be updated'}, ${skipped} already had onboardingComplete.`);

  if (!APPLY && updated > 0) {
    console.log('\nRun with --apply to execute the migration.');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
