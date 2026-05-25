import { defineConfig } from 'vitest/config';

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
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/dist/**',
        '**/vitest.config.*',
        '**/vitest.setup.ts',
        '**/*.{test,spec}.{ts,tsx}',
        'src/types.ts',
      ],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});
