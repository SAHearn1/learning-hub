#!/usr/bin/env node

import { spawn } from 'node:child_process';

const lanes = {
  phase5: { cmd: 'npm', args: ['run', 'phase5:gate'] },
  phase6: { cmd: 'npm', args: ['run', 'phase6:gate'] },
  phase7: { cmd: 'npm', args: ['run', 'phase7:gate'] },
  phase8: { cmd: 'npm', args: ['run', 'phase8:gate'] },
};

function parseSelection() {
  const selected = process.argv.slice(2).filter(Boolean);
  if (selected.length === 0) {
    return ['phase5', 'phase6', 'phase7'];
  }

  const invalid = selected.filter((name) => !(name in lanes));
  if (invalid.length > 0) {
    console.error(`Unknown lane(s): ${invalid.join(', ')}`);
    console.error(`Available lanes: ${Object.keys(lanes).join(', ')}`);
    process.exit(2);
  }

  return selected;
}

function runLane(name) {
  const lane = lanes[name];

  return new Promise((resolve) => {
    const child = spawn(lane.cmd, lane.args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(`[${name}] ${chunk}`);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(`[${name}] ${chunk}`);
    });

    child.on('close', (code) => {
      resolve({ name, code: code ?? 1 });
    });

    child.on('error', (err) => {
      process.stderr.write(`[${name}] failed to start: ${err.message}\n`);
      resolve({ name, code: 1 });
    });
  });
}

async function main() {
  const selected = parseSelection();

  console.log(`Launching phase lanes in parallel: ${selected.join(', ')}`);
  const results = await Promise.all(selected.map((name) => runLane(name)));

  console.log('\nPhase lane summary:');
  for (const result of results) {
    console.log(`- ${result.name}: ${result.code === 0 ? 'PASS' : `FAIL (${result.code})`}`);
  }

  if (results.some((result) => result.code !== 0)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Unexpected failure: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
