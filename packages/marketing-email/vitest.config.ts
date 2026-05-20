import { defineConfig } from 'vitest/config';

const mergeCoverage = process.env.COVERAGE_MERGE === '1';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: mergeCoverage
        ? ['text', 'json']
        : ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/dist/**',
        '**/vitest.config.*',
        '**/*.{test,spec}.ts',
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
