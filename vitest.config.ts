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
      // Coverage thresholds for reporting (not enforced in CI yet)
      // Current baseline: 27.53% statements, 43.44% functions
      // TODO: Incrementally add tests to reach these targets
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 50,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
