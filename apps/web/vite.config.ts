import { defineConfig, loadEnv, type Plugin } from 'vite';
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

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  const devHost = env.VITE_DEV_HOST;

  return {
    plugins: [
      react(),
      htmlBrandingPlugin,
      // mkcert is disabled - we use HTTP for multi-device development
      // to avoid mixed content issues with Supabase (which runs on HTTP)
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
    define: {
      __DEV__: 'import.meta.env.DEV',
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
      host: devHost || true,
      port: 5173,
      hmr: devHost
        ? {
            host: devHost,
          }
        : undefined,
    },
    preview: {
      port: 4173,
      host: devHost || true,
    },
  };
});
