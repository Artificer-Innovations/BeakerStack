import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { BRANDING } from '../../packages/shared/src/config/branding';

// https://vitejs.dev/config/
const htmlBrandingPlugin: Plugin = {
  name: 'html-branding-transform',
  transformIndexHtml(html: string) {
    return html.replace(/%APP_TITLE%/g, BRANDING.displayName);
  },
};

export default defineConfig({
  plugins: [react(), htmlBrandingPlugin],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/build/',
      ],
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
