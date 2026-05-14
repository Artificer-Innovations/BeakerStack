import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// Shim WebSocket for Node < 22 before any app module loads.
// supabase-js checks globalThis.WebSocket at createClient() time (module load, not runtime).
// renderToStaticMarkup never opens a socket, but the check throws on Node 20 without this.
// Dynamic imports below ensure this assignment runs first (static imports are hoisted).
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class WebSocket {
    constructor(_url: string) {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
// MemoryRouter comes from the same react-router-dom instance as <Link> and other
// router-aware components in LandingPage, so they share the same NavigationContext.
// StaticRouter (from react-router-dom/server) is a separate sub-package with its
// own bundled context, causing a null-context mismatch in vite-node's module graph.
const { MemoryRouter } = await import('react-router-dom');
// ThemeProvider needed because AppFooter renders ThemeToggle which calls useTheme().
const { ThemeProvider } = await import('../src/contexts/ThemeContext');
const { AppFooter } = await import('../src/components/AppFooter');
const { LandingPage } = await import('../src/components/landing/LandingPage');

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// Public home URL for canonical / og:url (set by deploy-web.sh per environment).
const siteOrigin = (
  process.env.VITE_PUBLIC_SITE_ORIGIN ?? 'https://beakerstack.com'
).replace(/\/$/, '');
let basePath = process.env.VITE_BASE_PATH ?? '/';
if (!basePath.startsWith('/')) basePath = `/${basePath}`;
basePath = basePath.replace(/\/+$/, '');
const homePath = basePath === '' ? '/' : `${basePath}/`;
const publicHomeUrl = `${siteOrigin}${homePath === '/' ? '/' : homePath}`;

const routerBasename =
  basePath === '' || basePath === '/' ? undefined : basePath;

// MemoryRouter matches locations against basename: with basename "/pr-N", "/" does not
// match (RR warns and renders nothing). Use the same pathname as publicHomeUrl path.
const initialEntries = [homePath];

// Layout wrapper classes mirror App.tsx ('bg-gray-50 dark:bg-gray-900') and RootLayout
// ('flex min-h-screen flex-col'). Update these when the App layout changes to keep the
// prerendered visual consistent with the hydrated page. No strict tree-match is required —
// createRoot replaces this subtree on first render without hydration alignment constraints.
const html = renderToStaticMarkup(
  createElement(
    ThemeProvider,
    null,
    createElement(
      MemoryRouter,
      { basename: routerBasename, initialEntries },
      createElement(
        'div',
        { className: 'bg-gray-50 dark:bg-gray-900' },
        createElement(
          'div',
          { className: 'flex min-h-screen flex-col' },
          createElement('div', { className: 'flex-1' }, createElement(LandingPage)),
          createElement(AppFooter)
        )
      )
    )
  )
);

// Structural smoke check — catches a broken render without hardcoding copy text.
// Fails the build if LandingPage produced no heading element.
if (!html.includes('<h1')) {
  console.error(
    'pre-render smoke check: no <h1> in output — LandingPage did not render'
  );
  process.exit(1);
}

const template = readFileSync(join(webRoot, 'dist', 'index.html'), 'utf8');

// canonical and og:url are home-only; inject here rather than in the base
// template which is also served as the SPA fallback for all other routes.
const withHomeMeta = template.replace(
  '</head>',
  [
    `  <link rel="canonical" href="${publicHomeUrl}" />`,
    `  <meta property="og:url" content="${publicHomeUrl}" />`,
    '  </head>',
  ].join('\n')
);

if (
  withHomeMeta === template ||
  !withHomeMeta.includes('rel="canonical"') ||
  !withHomeMeta.includes('property="og:url"')
) {
  console.error(
    'pre-render smoke check: </head> injection failed — dist/index.html may be missing </head> or markup changed'
  );
  process.exit(1);
}

const out = withHomeMeta.replace(
  '<div id="root"></div>',
  `<div id="root">${html}</div>`
);

// Verify the mount-point injection landed — catches a silent no-op if the
// root div markup ever changes (e.g. id renamed from "root" to "app").
if (out.includes('<div id="root"></div>')) {
  console.error(
    'pre-render smoke check: mount point injection failed — <div id="root"></div> still empty in output'
  );
  process.exit(1);
}

writeFileSync(join(webRoot, 'dist', 'prerender-home.html'), out);
console.log(`pre-render complete — ${html.length} chars`);
