import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkgRoot = path.dirname(fileURLToPath(new URL(import.meta.url)));
const repoRoot = path.resolve(pkgRoot, '../..');
const mergeCoverage = process.env.COVERAGE_MERGE === '1';

export default defineConfig({
  resolve: {
    alias: {
      'react-native': path.join(repoRoot, 'node_modules/react-native-web'),
    },
  },
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
      thresholds: {
        statements: 99,
        branches: 95,
        functions: 98,
        lines: 99,
      },
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/dist/**',
        '**/vitest.config.*',
        '**/vitest.setup.ts',
        '**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        // Type-only modules: no executable statements after TS emit
        'src/types.ts',
        'src/index.ts',
        'src/**/*.types.ts',
        // Native-only modules: no React Native runtime in CI
        'src/init.native.ts',
        'src/native.ts',
        'src/components/ObservabilityProvider.native.tsx',
      ],
    },
  },
});
