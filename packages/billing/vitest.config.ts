import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const pkgRoot = path.dirname(fileURLToPath(new URL(import.meta.url)));
const repoRoot = path.resolve(pkgRoot, '../..');

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
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/dist/**',
        '**/vitest.config.*',
        '**/vitest.setup.ts',
        '**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        // Type-only modules: no executable statements after TS emit; covered via imports in typeOnlyBarrel.test.ts
        'src/types.ts',
        'src/**/*.types.ts',
      ],
    },
  },
});
