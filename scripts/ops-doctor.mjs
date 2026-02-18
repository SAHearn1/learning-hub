#!/usr/bin/env node
import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const strictMode = process.argv.includes('--strict');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const checks = [];

function addCheck(name, run) {
  checks.push({ name, run });
}

function ok(message) {
  return { status: 'ok', message };
}

function warn(message) {
  return { status: 'warn', message };
}

function fail(message) {
  return { status: 'fail', message };
}

function parseEnvFile(filePath) {
  const out = {};

  if (!existsSync(filePath)) {
    return out;
  }

  const content = readFileSync(filePath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');

    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();

    if (key) {
      out[key] = value;
    }
  }

  return out;
}

function runCommand(command, args) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

addCheck('Node.js version', () => {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (major < 20) {
    return fail(`Node ${process.versions.node} detected. This project requires Node.js 20+.`);
  }
  return ok(`Node ${process.versions.node}`);
});

addCheck('Required commands are available', () => {
  const commands = ['npm', 'npx'];
  const missing = [];

  for (const cmd of commands) {
    const result = runCommand('bash', ['-lc', `command -v ${cmd}`]);
    if (result.status !== 0) {
      missing.push(cmd);
    }
  }

  if (missing.length > 0) {
    return fail(`Missing required command(s): ${missing.join(', ')}`);
  }

  return ok('npm and npx are available.');
});

addCheck('Project files', () => {
  const expected = ['package.json', 'next.config.js', 'prisma/schema.prisma'];
  const missing = expected.filter((file) => !existsSync(resolve(cwd, file)));

  if (missing.length > 0) {
    return fail(`Missing expected file(s): ${missing.join(', ')}`);
  }

  return ok('Core project files are present.');
});

addCheck('Dependencies installed', () => {
  const nodeModules = resolve(cwd, 'node_modules');
  if (!existsSync(nodeModules)) {
    return warn('node_modules directory not found. Run `npm install`.');
  }

  try {
    accessSync(nodeModules, constants.R_OK);
    return ok('node_modules is present and readable.');
  } catch {
    return fail('node_modules exists but is not readable.');
  }
});

addCheck('Environment files and required keys', () => {
  const envExamplePath = resolve(cwd, '.env.example');

  if (!existsSync(envExamplePath)) {
    return warn('.env.example not found; skipping required env var checks.');
  }

  const envExample = parseEnvFile(envExamplePath);
  const requiredKeys = Object.keys(envExample).filter((key) => !key.startsWith('#'));

  const env = {
    ...parseEnvFile(resolve(cwd, '.env')),
    ...parseEnvFile(resolve(cwd, '.env.local')),
    ...process.env,
  };

  const missing = requiredKeys.filter((key) => {
    const value = env[key];
    return value === undefined || value === '';
  });

  if (!existsSync(resolve(cwd, '.env')) && !existsSync(resolve(cwd, '.env.local'))) {
    return warn('Neither .env nor .env.local found. Copy .env.example to get started.');
  }

  if (missing.length > 0) {
    return warn(`Missing ${missing.length} env var(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', ...' : ''}`);
  }

  return ok(`Environment looks good (${requiredKeys.length} keys satisfied).`);
});

addCheck('Prisma schema validity', () => {
  if (!existsSync(resolve(cwd, 'node_modules'))) {
    return warn('Skipping prisma validate because dependencies are not installed.');
  }

  const result = runCommand('npx', ['prisma', 'validate']);

  if (result.status !== 0) {
    const details = (result.stderr.trim() || result.stdout.trim());

    if (/E403|ENOTFOUND|ECONN|forbidden|registry\.npmjs\.org/i.test(details)) {
      return warn(`Skipping prisma validate due to package registry/network restriction. ${details}`);
    }

    return fail(`Prisma validate failed. ${details}`);
  }

  return ok('Prisma schema validates.');
});

console.log(`${colors.cyan}Running RootWork Learning Hub operational diagnostics...${colors.reset}`);

let failCount = 0;
let warnCount = 0;

for (const check of checks) {
  const result = check.run();

  if (result.status === 'ok') {
    console.log(`${colors.green}✔${colors.reset} ${check.name}: ${result.message}`);
  } else if (result.status === 'warn') {
    warnCount += 1;
    console.log(`${colors.yellow}▲${colors.reset} ${check.name}: ${result.message}`);
  } else {
    failCount += 1;
    console.log(`${colors.red}✖${colors.reset} ${check.name}: ${result.message}`);
  }
}

if (failCount > 0 || (strictMode && warnCount > 0)) {
  console.log(`\n${colors.red}Doctor checks did not pass (${failCount} fail, ${warnCount} warn).${colors.reset}`);
  process.exit(1);
}

if (warnCount > 0) {
  console.log(`\n${colors.yellow}Doctor checks completed with warnings (${warnCount}).${colors.reset}`);
} else {
  console.log(`\n${colors.green}All doctor checks passed.${colors.reset}`);
}
