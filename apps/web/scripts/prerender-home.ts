/* eslint-disable no-console -- build script */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class WebSocket {
    constructor(_url: string) {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

const { configureAdopter } =
  await import('../../../packages/shared/src/config/adopterRuntime');
const { adopterConfig } = await import('../../../adopter/config/index');

configureAdopter(adopterConfig);

const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { MemoryRouter } = await import('react-router');
const { ThemeProvider } = await import('../src/contexts/ThemeContext');
const { AppFooter } = await import('../src/components/AppFooter');
const { LandingPageSSR } =
  await import('../src/components/landing/LandingPageSSR');
const { LAYOUT } = await import('../src/lib/layoutConstants');

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

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

const initialEntries = [homePath];

const html = renderToStaticMarkup(
  createElement(
    ThemeProvider,
    null,
    createElement(
      MemoryRouter,
      { basename: routerBasename, initialEntries },
      createElement(
        'div',
        { className: LAYOUT.outer },
        createElement(
          'div',
          { className: LAYOUT.shell },
          createElement(
            'div',
            { className: LAYOUT.content },
            createElement(LandingPageSSR)
          ),
          createElement(AppFooter)
        )
      )
    )
  )
);

if (!html.includes('<h1')) {
  console.error(
    'pre-render smoke check: no <h1> in output — LandingPageSSR did not render'
  );
  process.exit(1);
}

const template = readFileSync(join(webRoot, 'dist', 'index.html'), 'utf8');

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

if (out.includes('<div id="root"></div>')) {
  console.error(
    'pre-render smoke check: mount point injection failed — <div id="root"></div> still empty in output'
  );
  process.exit(1);
}

writeFileSync(join(webRoot, 'dist', 'prerender-home.html'), out);
console.log(`pre-render complete — ${html.length} chars`);
