#!/usr/bin/env tsx

/**
 * Data Retention Enforcement Script
 * Manually run data retention enforcement job
 * Usage: tsx scripts/run-data-retention.ts
 */

import { enforceDataRetention, getRetentionStatistics } from '@/lib/compliance/data-retention';
import { logger } from '@/lib/logger';

async function main() {
  logger.info('Starting manual data retention enforcement');

  console.log('\n==============================================');
  console.log('  DATA RETENTION ENFORCEMENT');
  console.log('  COPPA Compliance');
  console.log('==============================================\n');

  // Show current statistics
  console.log('📊 Current Retention Statistics:\n');
  const statsBefore = await getRetentionStatistics();
  console.log(JSON.stringify(statsBefore, null, 2));
  console.log('\n');

  // Run enforcement
  console.log('🔄 Running data retention enforcement...\n');
  const result = await enforceDataRetention();

  // Show results
  console.log('\n==============================================');
  console.log('  ENFORCEMENT RESULTS');
  console.log('==============================================\n');
  console.log(`Job ID:            ${result.jobId}`);
  console.log(`Status:            ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Duration:          ${
    (result.endTime.getTime() - result.startTime.getTime()) / 1000
  }s`);
  console.log(`Records Processed: ${result.recordsProcessed}`);
  console.log(`Records Deleted:   ${result.recordsDeleted}`);
  console.log(`Records Anonymized: ${result.recordsAnonymized}`);
  console.log(`Errors:            ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  // Show updated statistics
  console.log('\n📊 Updated Retention Statistics:\n');
  const statsAfter = await getRetentionStatistics();
  console.log(JSON.stringify(statsAfter, null, 2));

  console.log('\n==============================================\n');

  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  logger.error('Data retention enforcement script failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  console.error('Error:', error);
  process.exit(1);
});
