import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { BRANDING } from '../../packages/shared/src/config/branding';

const viteConfigDir = path.dirname(fileURLToPath(import.meta.url));
const criticalThemePath = path.join(
  viteConfigDir,
  'src/styles/critical-theme.css'
);

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

      const criticalCss = readFileSync(criticalThemePath, 'utf8').trim();
      transformed = transformed.replace(
        '</script>\n\n    <!-- Site-wide meta',
        `</script>\n\n    <!-- Critical theme background — source: src/styles/critical-theme.css (also @import in index.css) -->\n    <style id="critical-theme-fouc">\n${criticalCss}\n    </style>\n\n    <!-- Site-wide meta`
      );

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

      if (!transformed.includes('id="critical-theme-fouc"')) {
        throw new Error(
          'htmlBrandingPlugin: critical theme CSS was not injected — check index.html has </script> then <!-- Site-wide meta (two newlines between).'
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
        '@beakerstack/shared': path.resolve(
          __dirname,
          '../../packages/shared/src'
        ),
      },
    },
    define: {
      __DEV__: JSON.stringify(isDev),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/@supabase/')) {
              return 'supabase-vendor';
            }
            if (id.includes('/node_modules/lucide-react')) {
              return 'icons-vendor';
            }
          },
        },
      },
    },
    // Externalize router packages in SSR/vite-node context so both
    // react-router-dom (ESM, used by app components) and
    // react-router-dom/server (CJS) resolve through the same CJS
    // require() call and share a single NavigationContext instance.
    ssr: {
      external: ['react-router', 'react-router-dom', '@remix-run/router'],
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        // Line/statement ~99.1% with integration-heavy pages (billing matrix, OAuth stash).
        thresholds: {
          statements: 99,
          lines: 99,
        },
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/dist/',
          '**/build/',
          '**/types/**',
          // Pure config/data files — no logic to test, always mocked in tests
          'src/config/landing.ts',
          'src/config/landing.example.alt.ts',
          // Build-time scripts — run by vite-node at build, not part of the app test suite
          'scripts/',
          // SSR-only landing component — structural duplicate of LandingPage used by the
          // prerender script only; covered by the build-time prerender smoke check
          'src/components/landing/LandingPageSSR.tsx',
          // Thin composition wrapper for auth providers — no logic; constituent
          // providers and routing are tested independently
          'src/AuthShell.tsx',
          // Display-only dashboard showcase components — no business logic;
          // annotated UI primitives covered visually by preview deployment
          'src/components/dashboard/AnnotatedPrimitive.tsx',
          'src/components/dashboard/BooleanFeatureTiles.tsx',
          'src/components/dashboard/DemoBanner.tsx',
          'src/components/dashboard/FeatureGateCard.tsx',
          // Pure TypeScript interface file — no executable code to test
          '**/components/dashboard/types.ts',
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
