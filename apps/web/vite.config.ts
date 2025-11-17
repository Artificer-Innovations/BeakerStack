import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { BRANDING } from '../../packages/shared/src/config/branding';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  const devHost = env.VITE_DEV_HOST;
  const isDev = mode === 'development';
  // Respect VITE_BASE_PATH for asset URLs (defaults to '/' for local development)
  const basePath = env.VITE_BASE_PATH || '/';

  const htmlBrandingPlugin: Plugin = {
    name: 'html-branding-transform',
    transformIndexHtml(html: string) {
      let transformed = html.replace(/%APP_TITLE%/g, BRANDING.displayName);

      // Transform absolute paths in HTML to respect base path
      // Only transform if base path is not root (e.g., /pr-9)
      if (basePath !== '/') {
        // Transform favicon and other asset paths from /path to /basePath/path
        const absolutePathPattern = /(href|src)="(\/[^"]+)"/g;
        transformed = transformed.replace(
          absolutePathPattern,
          (match, attr, path) => {
            // Skip if already includes the base path or is a data URI
            if (path.startsWith(basePath) || path.startsWith('data:')) {
              return match;
            }
            // Transform /path to /basePath/path
            return `${attr}="${basePath}${path.substring(1)}"`;
          }
        );
      }

      return transformed;
    },
  };

  return {
    base: basePath,
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
      __DEV__: JSON.stringify(isDev),
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
          '**/types/**',
          '**/DebugTools.tsx',
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
