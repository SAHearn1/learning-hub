import { defineConfig } from 'vitest/config';
import path from 'path';

const isCI = Boolean(process.env.CI) || Boolean(process.env.GITHUB_ACTIONS);
const isWindows = process.platform === 'win32';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/e2e/**'],

    // Windows environments (CI and local) can be flaky with multi-worker runs
    // ("Worker exited unexpectedly") and hit worker-thread memory issues causing
    // false timeout failures from Prisma mock contention. Force deterministic
    // single-worker execution on Windows.
    ...(isWindows
      ? {
          pool: 'forks',
          fileParallelism: false,
          maxWorkers: 1,
          minWorkers: 1,
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
        }
      : {}),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/types/',
        'scripts/',
        'prisma/',
        '.next/',
      ],
      // Coverage thresholds — measured baseline from CI (2026-03-09).
      // Integration tests use mocks and don't drive line coverage; unit tests
      // do. Thresholds are set to the measured baseline so CI enforces no
      // regression rather than an aspirational target.
      // Baseline: ~41% statements/lines, ~48% functions, ~35% branches.
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 45,
        lines: 40,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
