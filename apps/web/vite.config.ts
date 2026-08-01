import { readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { branding } from '../../adopter/config/branding';

const viteConfigDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(viteConfigDir, '../..');
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
      const metaDescription = `${branding.displayName} gives you auth, billing, and a cross-platform React foundation — ready to ship your SaaS.`;
      const ogTitle = `${branding.displayName} — Ship your SaaS faster.`;
      let transformed = html
        .replace(/%APP_TITLE%/g, branding.displayName)
        .replace(/%META_DESCRIPTION%/g, metaDescription)
        .replace(/%OG_TITLE%/g, ogTitle);

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
        '@adopter': path.resolve(__dirname, '../../adopter'),
        '@beakerstack/shared': path.resolve(
          __dirname,
          '../../packages/shared/src'
        ),
        '@beakerstack/help': path.resolve(__dirname, '../../packages/help/src'),
        '@beakerstack/articles': path.resolve(
          __dirname,
          '../../packages/articles/src'
        ),
        '@beakerstack/connections': path.resolve(
          __dirname,
          '../../packages/connections/src'
        ),
        '@beakerstack/logger': path.resolve(
          __dirname,
          '../../packages/logger/src'
        ),
        '@beakerstack/analytics/web': path.resolve(
          __dirname,
          '../../packages/analytics/src/web.ts'
        ),
        '@beakerstack/analytics': path.resolve(
          __dirname,
          '../../packages/analytics/src'
        ),
        // @plausible-analytics/tracker has no `exports` map — only `"module": "./plausible.js"`.
        // Vite fails to resolve the package entry without this alias (web vitest + build).
        '@plausible-analytics/tracker': path.resolve(
          repoRoot,
          'node_modules/@plausible-analytics/tracker/plausible.js'
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
      root: repoRoot,
      globals: true,
      environment: 'jsdom',
      setupFiles: [path.join(viteConfigDir, 'src/test/setup.ts')],
      include: [
        'apps/web/src/**/*.{test,spec}.{ts,tsx}',
        'adopter/web/**/*.{test,spec}.{ts,tsx}',
        'adopter/config/**/*.{test,spec}.{ts,tsx}',
      ],
      // Placeholder Supabase env when unset (jsdom imports supabase.ts at module load).
      // CI integration exports real credentials via GITHUB_ENV — those take precedence.
      env: {
        VITE_SUPABASE_URL:
          process.env.VITE_SUPABASE_URL ?? 'http://localhost:54321',
        VITE_SUPABASE_ANON_KEY:
          process.env.VITE_SUPABASE_ANON_KEY ?? 'test-anon-key',
      },
      coverage: {
        provider: 'v8',
        reportsDirectory: path.join(viteConfigDir, 'coverage'),
        reporter:
          process.env.COVERAGE_MERGE === '1'
            ? ['text', 'json']
            : ['text', 'json', 'html', 'lcov'],
        // Vitest 4 V8 remapping is stricter than v3 (~96% stmts / ~99% lines here).
        thresholds: {
          statements: 96,
          lines: 98,
        },
        include: [
          'apps/web/src/**/*.{ts,tsx}',
          'adopter/web/**/*.{ts,tsx}',
          'adopter/config/**/*.{ts,tsx}',
        ],
        exclude: [
          'node_modules/',
          'apps/web/src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/dist/',
          '**/build/',
          '**/types/**',
          // Build-time scripts — run by vite-node at build, not part of the app test suite
          'apps/web/scripts/',
          // SSR-only landing component — structural duplicate of LandingPage used by the
          // prerender script only; covered by the build-time prerender smoke check
          'apps/web/src/components/landing/LandingPageSSR.tsx',
          'apps/web/src/components/articles/ArticlesPublicSSR.tsx',
          // Thin composition wrappers — routing/providers tested independently
          'apps/web/src/PublicShell.tsx',
          'apps/web/src/AuthenticatedApp.tsx',
          'adopter/web/**/__tests__/**',
          'adopter/web/**/types.ts',
          'adopter/config/landing.example.alt.ts',
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
