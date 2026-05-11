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
const { LandingPage } = await import('../src/components/landing/LandingPage');

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const html = renderToStaticMarkup(
  createElement(
    MemoryRouter,
    { initialEntries: ['/'] },
    createElement(LandingPage)
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
    '  <link rel="canonical" href="https://beakerstack.com/" />',
    '  <meta property="og:url" content="https://beakerstack.com/" />',
    '  </head>',
  ].join('\n')
);

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
