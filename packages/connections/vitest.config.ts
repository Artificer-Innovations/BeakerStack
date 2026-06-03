import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkgRoot = path.dirname(fileURLToPath(import.meta.url));
const mergeCoverage = process.env.COVERAGE_MERGE === '1';

export default defineConfig({
  test: {
    environment: 'jsdom',
    maxWorkers: 1,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: mergeCoverage
        ? ['text', 'json']
        : ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/dist/**',
        '**/vitest.config.*',
        '**/vitest.setup.ts',
        '**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
      ],
      thresholds: {
        statements: 99,
        branches: 99,
        functions: 97,
        lines: 100,
      },
    },
  },
});
