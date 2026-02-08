#!/usr/bin/env node

import { spawn } from 'node:child_process';

const DEFAULT_TASKS = [
  { name: 'lint', cmd: 'npm', args: ['run', 'lint'] },
  { name: 'typecheck', cmd: 'npx', args: ['tsc', '--noEmit'] },
  { name: 'unit-tests', cmd: 'npm', args: ['test', '--', '--run', '--passWithNoTests'] },
  { name: 'integration-tests', cmd: 'npm', args: ['run', 'test:integration'] },
  { name: 'build', cmd: 'npm', args: ['run', 'build'] },
];

const SELECTABLE_TASKS = new Map(DEFAULT_TASKS.map((task) => [task.name, task]));

function parseSelectedTasks() {
  const requested = process.argv
    .slice(2)
    .map((arg) => arg.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    return DEFAULT_TASKS;
  }

  const invalid = requested.filter((name) => !SELECTABLE_TASKS.has(name));
  if (invalid.length > 0) {
    console.error(`Unknown task(s): ${invalid.join(', ')}`);
    console.error(`Available tasks: ${Array.from(SELECTABLE_TASKS.keys()).join(', ')}`);
    process.exit(2);
  }

  return requested.map((name) => SELECTABLE_TASKS.get(name));
}

function runTask(task) {
  return new Promise((resolve) => {
    const child = spawn(task.cmd, task.args, {
      shell: false,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const prefix = `[${task.name}]`;

    child.stdout.on('data', (chunk) => {
      process.stdout.write(`${prefix} ${chunk}`);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(`${prefix} ${chunk}`);
    });

    child.on('close', (code) => {
      resolve({ task: task.name, code: code ?? 1, child });
    });

    child.on('error', (error) => {
      console.error(`${prefix} Failed to start: ${error.message}`);
      resolve({ task: task.name, code: 1, child });
    });
  });
}

async function main() {
  const tasks = parseSelectedTasks();

  console.log(`Launching ${tasks.length} parallel task agent(s): ${tasks.map((t) => t.name).join(', ')}`);

  const taskRuns = tasks.map((task) => runTask(task));
  const results = await Promise.all(taskRuns);
  const failed = results.filter((result) => result.code !== 0);

  console.log('\nParallel task summary:');
  for (const result of results) {
    const status = result.code === 0 ? 'PASS' : `FAIL (${result.code})`;
    console.log(`- ${result.task}: ${status}`);
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
